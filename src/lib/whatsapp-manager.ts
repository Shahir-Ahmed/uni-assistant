import fs from "fs"
import os from "os"
import path from "path"
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  normalizeMessageContent,
  proto,
  WASocket,
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import pino from "pino"
import QRCode from "qrcode"
import { prisma } from "@/lib/db"
import {
  DEFAULT_WHATSAPP_CONFIG,
  extractFromWhatsApp,
  syncWhatsAppExtractionToDb,
  WhatsAppGroupConfig,
  WhatsAppGroupKind,
  WhatsAppSyncConfig,
} from "@/lib/whatsapp-extractor"
import { createEncryptedMultiFileAuthState } from "@/lib/wa-encrypted-auth"
import { generateSecureToken } from "@/lib/security"

export type WhatsAppConnectionPhase =
  | "IDLE"
  | "INITIALIZING"
  | "QR_READY"
  | "PAIRING_CODE_READY"
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"

export interface DiscoveredWhatsAppGroup {
  id: string
  subject: string
  description?: string
  participantsCount: number
  kind: WhatsAppGroupKind
  isCommunity: boolean
  isCommunityAnnounce: boolean
  linkedParentId: string | null
  linkedParentName: string | null
}

export interface WhatsAppSessionSnapshot {
  sessionKey: string
  status: WhatsAppConnectionPhase
  qrString: string | null
  qrDataUrl: string | null
  pairingCode: string | null
  phoneNumber: string | null
  connectedJid: string | null
  connectedName: string | null
  waVersion: string | null
  groups: DiscoveredWhatsAppGroup[]
  bufferedMessageCount: number
  lastSyncSummary: {
    scanned: number
    imported: number
    skippedDuplicates: number
    syncedAt: string
  } | null
  lastError: string | null
  qrGeneratedAt: number | null
  updatedAt: string
}

interface BufferedWaMessage {
  keyId: string
  remoteJid: string
  senderName: string
  text: string
  attachmentName: string | null
  attachmentMime: string | null
  timestampMs: number
}

interface InternalSession {
  sessionKey: string
  userId: string | null
  authDir: string
  sock: WASocket | null
  snapshot: WhatsAppSessionSnapshot
  requestedPairingPhone: string | null
  pairingCodeRequested: boolean
  isStopping: boolean
  createdAt: number
  lastActivityAt: number
  bufferedMessages: BufferedWaMessage[]
  waiters: Array<() => void>
}

const SESSIONS_ROOT = path.join(os.tmpdir(), "scholaros-whatsapp-sessions")
const ONBOARDING_TTL_MS = 12 * 60 * 1000 // 12 minutes max for unpromoted signup sessions
const MAX_ACTIVE_ONBOARDING_SESSIONS = 15
const MAX_BUFFERED_MESSAGES = 120
const HISTORY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // last 14 days

declare global {
  // eslint-disable-next-line no-var
  var __scholarosWaSessions: Map<string, InternalSession> | undefined
}

function getSessionStore(): Map<string, InternalSession> {
  if (!globalThis.__scholarosWaSessions) {
    globalThis.__scholarosWaSessions = new Map<string, InternalSession>()
  }
  return globalThis.__scholarosWaSessions
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_")
}

function formatPairingCode(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`
  }
  return clean
}

function createEmptySnapshot(sessionKey: string): WhatsAppSessionSnapshot {
  return {
    sessionKey,
    status: "IDLE",
    qrString: null,
    qrDataUrl: null,
    pairingCode: null,
    phoneNumber: null,
    connectedJid: null,
    connectedName: null,
    waVersion: null,
    groups: [],
    bufferedMessageCount: 0,
    lastSyncSummary: null,
    lastError: null,
    qrGeneratedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

function notifyWaiters(session: InternalSession) {
  session.lastActivityAt = Date.now()
  session.snapshot.updatedAt = new Date().toISOString()
  const list = [...session.waiters]
  session.waiters = []
  for (const resolve of list) {
    try {
      resolve()
    } catch {
      // ignore
    }
  }
}

/**
 * Recursively unwraps Baileys message envelopes (ephemeral, viewOnce, edited, documentWithCaption, polls, media captions).
 */
function parseBaileysMessageContent(rawMsg: proto.IWebMessageInfo): {
  text: string
  attachmentName: string | null
  attachmentMime: string | null
} {
  if (!rawMsg?.message) {
    return { text: "", attachmentName: null, attachmentMime: null }
  }

  let content = normalizeMessageContent(rawMsg.message) || rawMsg.message

  // Handle edited messages
  if (content.editedMessage?.message) {
    content = normalizeMessageContent(content.editedMessage.message) || content.editedMessage.message
  }
  if (content.protocolMessage?.editedMessage) {
    content =
      normalizeMessageContent(content.protocolMessage.editedMessage) ||
      content.protocolMessage.editedMessage
  }

  let text = ""
  let attachmentName: string | null = null
  let attachmentMime: string | null = null

  if (content.conversation) {
    text = content.conversation
  } else if (content.extendedTextMessage?.text) {
    text = content.extendedTextMessage.text
  } else if (content.imageMessage) {
    text = content.imageMessage.caption || ""
    attachmentMime = content.imageMessage.mimetype || "image/jpeg"
    attachmentName = "WhatsApp Image"
  } else if (content.videoMessage) {
    text = content.videoMessage.caption || ""
    attachmentMime = content.videoMessage.mimetype || "video/mp4"
  } else if (content.documentMessage) {
    attachmentName = content.documentMessage.fileName || content.documentMessage.title || "Academic Document"
    attachmentMime = content.documentMessage.mimetype || "application/pdf"
    const caption = content.documentMessage.caption || ""
    text = caption
      ? `${caption}\n[Shared Document: ${attachmentName}]`
      : `Shared study document: ${attachmentName}`
  } else if (content.pollCreationMessage || content.pollCreationMessageV3) {
    const poll = content.pollCreationMessageV3 || content.pollCreationMessage
    const opts = (poll?.options || []).map((o) => o.optionName).filter(Boolean).join(", ")
    if (poll?.name) {
      text = `Poll: ${poll.name}${opts ? ` (Options: ${opts})` : ""}`
    }
  }

  return {
    text: text.trim(),
    attachmentName,
    attachmentMime,
  }
}

/**
 * Fetches participating University Communities, Announcement Channels, Sub-Groups, and Study Groups.
 */
async function fetchParticipatingCommunitiesAndGroups(
  sock: WASocket
): Promise<DiscoveredWhatsAppGroup[]> {
  const groupMap = await sock.groupFetchAllParticipating()
  const rawGroups = Object.values(groupMap) as any[]

  const parentNameMap = new Map<string, string>()
  for (const g of rawGroups) {
    if (g.id && g.subject) {
      parentNameMap.set(g.id, g.subject)
    }
  }

  const discovered: DiscoveredWhatsAppGroup[] = rawGroups.map((g) => {
    const isCommunity = Boolean(g.isCommunity)
    const isCommunityAnnounce = Boolean(g.isCommunityAnnounce)
    const linkedParentId = g.linkedParent || null
    const linkedParentName = linkedParentId ? parentNameMap.get(linkedParentId) || "University Community" : null

    let kind: WhatsAppGroupKind = "GROUP"
    if (isCommunity) kind = "COMMUNITY"
    else if (isCommunityAnnounce) kind = "COMMUNITY_ANNOUNCEMENTS"
    else if (linkedParentId) kind = "SUBGROUP"

    return {
      id: g.id,
      subject: g.subject || "WhatsApp Group",
      description: typeof g.desc === "string" ? g.desc.slice(0, 240) : undefined,
      participantsCount: Array.isArray(g.participants) ? g.participants.length : g.size || 0,
      kind,
      isCommunity,
      isCommunityAnnounce,
      linkedParentId,
      linkedParentName,
    }
  })

  // Prioritize Communities & Community Announcements first, then sub-groups & regular groups
  const orderWeight: Record<WhatsAppGroupKind, number> = {
    COMMUNITY_ANNOUNCEMENTS: 0,
    COMMUNITY: 1,
    SUBGROUP: 2,
    GROUP: 3,
  }
  discovered.sort((a, b) => orderWeight[a.kind] - orderWeight[b.kind])
  return discovered
}

async function persistConnectedStateToDb(
  userId: string,
  phone: string,
  discoveredGroups: DiscoveredWhatsAppGroup[]
) {
  try {
    const existing = await prisma.preference.findUnique({
      where: { userId_key: { userId, key: "whatsapp_config" } },
    })
    const currentCfg: WhatsAppSyncConfig =
      (existing?.value as unknown as WhatsAppSyncConfig) || {
        ...DEFAULT_WHATSAPP_CONFIG,
        webhookVerifyToken: generateSecureToken("scholaros_wa", 16),
      }

    // Preserve user's existing group autoSync preferences while updating real WhatsApp metadata
    const existingById = new Map((currentCfg.groups || []).map((g) => [g.id, g]))
    const existingByName = new Map(
      (currentCfg.groups || []).map((g) => [g.name.toLowerCase(), g])
    )
    const palette = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0D9488", "#DC2626"]
    const mergedGroups: WhatsAppGroupConfig[] = []
    const seenIds = new Set<string>()

    discoveredGroups.forEach((dg, idx) => {
      const prev = existingById.get(dg.id) || existingByName.get(dg.subject.toLowerCase())
      const codeMatch = `${dg.subject} ${dg.description || ""}`.match(/\b([A-Z]{2,5}[-\s]?\d{3})\b/i)
      const detectedCode = codeMatch ? codeMatch[1].toUpperCase().replace(/\s+/, "-") : "GENERAL"

      seenIds.add(dg.id)
      mergedGroups.push({
        id: dg.id,
        name: dg.subject,
        subjectCode: prev?.subjectCode || detectedCode,
        subjectId: prev?.subjectId,
        autoSync: prev ? prev.autoSync : true,
        messageCount: prev?.messageCount || 0,
        lastActive: prev?.lastActive || "Synced via WhatsApp",
        color: prev?.color || palette[idx % palette.length],
        kind: dg.kind,
        isCommunity: dg.isCommunity,
        isCommunityAnnounce: dg.isCommunityAnnounce,
        linkedParentId: dg.linkedParentId,
        linkedParentName: dg.linkedParentName,
        participantsCount: dg.participantsCount,
        description: dg.description,
      })
    })

    // Keep user's custom manually-added groups as well
    for (const oldGrp of currentCfg.groups || []) {
      if (!seenIds.has(oldGrp.id) && !discoveredGroups.some((d) => d.subject.toLowerCase() === oldGrp.name.toLowerCase())) {
        mergedGroups.push(oldGrp)
      }
    }

    const nextCfg: WhatsAppSyncConfig = {
      ...currentCfg,
      status: "CONNECTED",
      permissionGranted: true,
      permissionGrantedAt: currentCfg.permissionGrantedAt || new Date().toISOString(),
      pairedPhone: phone || currentCfg.pairedPhone,
      pairedAt: currentCfg.pairedAt || new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      webhookVerifyToken: currentCfg.webhookVerifyToken || generateSecureToken("scholaros_wa", 16),
      groups: mergedGroups.slice(0, 60),
    }

    await prisma.preference.upsert({
      where: { userId_key: { userId, key: "whatsapp_config" } },
      update: { value: nextCfg as any },
      create: { userId, key: "whatsapp_config", value: nextCfg as any },
    })
  } catch (err) {
    console.warn("Failed to persist WhatsApp connected state to DB:", err)
  }
}

async function persistDisconnectedStateToDb(userId: string) {
  try {
    const existing = await prisma.preference.findUnique({
      where: { userId_key: { userId, key: "whatsapp_config" } },
    })
    if (!existing) return
    const currentCfg = existing.value as unknown as WhatsAppSyncConfig
    const nextCfg: WhatsAppSyncConfig = {
      ...currentCfg,
      status: "DISCONNECTED",
    }
    await prisma.preference.update({
      where: { userId_key: { userId, key: "whatsapp_config" } },
      data: { value: nextCfg as any },
    })
  } catch (err) {
    console.warn("Failed to persist WhatsApp disconnected state:", err)
  }
}

function cleanupExpiredOnboardingSessions() {
  const store = getSessionStore()
  const now = Date.now()
  for (const [key, sess] of store.entries()) {
    if (
      key.startsWith("onboard-") &&
      !sess.userId &&
      now - sess.lastActivityAt > ONBOARDING_TTL_MS
    ) {
      sess.isStopping = true
      teardownSocket(sess)
      fs.rmSync(sess.authDir, { recursive: true, force: true })
      store.delete(key)
    }
  }
}

function getOrCreateInternalSession(sessionKey: string, userId: string | null = null): InternalSession {
  cleanupExpiredOnboardingSessions()

  const store = getSessionStore()
  const safeKey = sanitizeKey(sessionKey)
  let session = store.get(safeKey)

  if (!session) {
    // Cap unauthenticated onboarding sessions to protect RAM/sockets from DoS
    if (safeKey.startsWith("onboard-")) {
      const onboardingCount = Array.from(store.keys()).filter((k) => k.startsWith("onboard-")).length
      if (onboardingCount >= MAX_ACTIVE_ONBOARDING_SESSIONS) {
        // Evict oldest inactive onboarding session
        let oldestKey: string | null = null
        let oldestTime = Infinity
        for (const [k, s] of store.entries()) {
          if (k.startsWith("onboard-") && s.lastActivityAt < oldestTime) {
            oldestTime = s.lastActivityAt
            oldestKey = k
          }
        }
        if (oldestKey) {
          const evicted = store.get(oldestKey)
          if (evicted) {
            evicted.isStopping = true
            teardownSocket(evicted)
            fs.rmSync(evicted.authDir, { recursive: true, force: true })
          }
          store.delete(oldestKey)
        }
      }
    }

    const authDir = path.join(SESSIONS_ROOT, safeKey)
    session = {
      sessionKey: safeKey,
      userId,
      authDir,
      sock: null,
      snapshot: createEmptySnapshot(safeKey),
      requestedPairingPhone: null,
      pairingCodeRequested: false,
      isStopping: false,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      bufferedMessages: [],
      waiters: [],
    }
    store.set(safeKey, session)
  } else {
    session.lastActivityAt = Date.now()
    if (userId && !session.userId) {
      session.userId = userId
    }
  }

  return session
}

function teardownSocket(session: InternalSession) {
  if (!session.sock) return
  const oldSock = session.sock
  session.sock = null
  try {
    oldSock.ev.removeAllListeners("connection.update")
    oldSock.ev.removeAllListeners("creds.update")
    oldSock.ev.removeAllListeners("messages.upsert")
    oldSock.ev.removeAllListeners("messaging-history.set")
    oldSock.end(undefined)
  } catch {
    // ignore socket teardown errors
  }
}

/**
 * Processes an incoming or buffered group/community message under strict student permissions & deduplication.
 */
async function processAcademicMessageForUser(
  session: InternalSession,
  msg: BufferedWaMessage
): Promise<{ imported: boolean; skippedDuplicate: boolean }> {
  if (!session.userId) return { imported: false, skippedDuplicate: false }
  if (!msg.remoteJid.endsWith("@g.us")) {
    // Privacy guard: only scan community & study groups, NEVER private 1-on-1 personal DMs
    return { imported: false, skippedDuplicate: false }
  }

  const pref = await prisma.preference.findUnique({
    where: { userId_key: { userId: session.userId, key: "whatsapp_config" } },
  })
  const cfg = pref?.value as unknown as WhatsAppSyncConfig | undefined
  if (!cfg || cfg.permissionGranted !== true) {
    return { imported: false, skippedDuplicate: false }
  }

  // Resolve group & parent community metadata
  let discovered = session.snapshot.groups.find((g) => g.id === msg.remoteJid)
  if (!discovered && session.sock) {
    try {
      const meta: any = await session.sock.groupMetadata(msg.remoteJid)
      const parentGroup = meta.linkedParent
        ? session.snapshot.groups.find((g) => g.id === meta.linkedParent)
        : undefined
      discovered = {
        id: msg.remoteJid,
        subject: meta.subject || msg.remoteJid,
        description: meta.desc,
        participantsCount: Array.isArray(meta.participants) ? meta.participants.length : 0,
        kind: meta.isCommunityAnnounce
          ? "COMMUNITY_ANNOUNCEMENTS"
          : meta.isCommunity
          ? "COMMUNITY"
          : meta.linkedParent
          ? "SUBGROUP"
          : "GROUP",
        isCommunity: Boolean(meta.isCommunity),
        isCommunityAnnounce: Boolean(meta.isCommunityAnnounce),
        linkedParentId: meta.linkedParent || null,
        linkedParentName: parentGroup?.subject || null,
      }
    } catch {
      // fallback
    }
  }

  const groupName = discovered?.subject || msg.remoteJid
  const parentCommunityName = discovered?.linkedParentName || null

  // Enforce per-group autoSync toggle if group exists in student's config
  const configuredGroup = (cfg.groups || []).find(
    (g) => g.id === msg.remoteJid || g.name.toLowerCase() === groupName.toLowerCase()
  )
  if (configuredGroup && configuredGroup.autoSync === false) {
    return { imported: false, skippedDuplicate: false }
  }

  const subjects = await prisma.subject.findMany({
    where: { userId: session.userId, isArchived: false },
    select: { id: true, name: true, code: true },
  })

  const extraction = await extractFromWhatsApp(msg.text, groupName, subjects, {
    communityName: parentCommunityName,
    attachmentName: msg.attachmentName,
    attachmentMime: msg.attachmentMime,
  })

  const syncResult = await syncWhatsAppExtractionToDb(
    session.userId,
    extraction,
    msg.text,
    groupName,
    msg.senderName,
    {
      waMessageKey: msg.keyId || undefined,
      groupId: msg.remoteJid,
      respectConfigRules: true,
      config: cfg,
      attachmentName: msg.attachmentName,
      attachmentMime: msg.attachmentMime,
    }
  )

  return {
    imported: Boolean(syncResult.success && !syncResult.skipped),
    skippedDuplicate: Boolean((syncResult as any).duplicate),
  }
}

async function runBufferedHistorySync(session: InternalSession) {
  if (!session.userId || session.bufferedMessages.length === 0) {
    return { scanned: 0, imported: 0, skippedDuplicates: 0, syncedAt: new Date().toISOString() }
  }

  let scanned = 0
  let imported = 0
  let skippedDuplicates = 0

  // Process recent up to 40 buffered group messages chronologically (oldest first)
  const batch = [...session.bufferedMessages]
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .slice(-40)

  for (const item of batch) {
    scanned++
    try {
      const res = await processAcademicMessageForUser(session, item)
      if (res.imported) imported++
      else if (res.skippedDuplicate) skippedDuplicates++
    } catch (err) {
      console.warn("History sync item error:", err)
    }
  }

  const summary = {
    scanned,
    imported,
    skippedDuplicates,
    syncedAt: new Date().toISOString(),
  }
  session.snapshot.lastSyncSummary = summary
  notifyWaiters(session)
  return summary
}

async function launchSocket(session: InternalSession) {
  fs.mkdirSync(SESSIONS_ROOT, { recursive: true, mode: 0o700 })
  fs.mkdirSync(session.authDir, { recursive: true, mode: 0o700 })

  teardownSocket(session)

  session.isStopping = false
  session.pairingCodeRequested = false
  session.snapshot.status = "INITIALIZING"
  session.snapshot.lastError = null
  notifyWaiters(session)

  const { state, saveCreds } = await createEncryptedMultiFileAuthState(session.authDir)
  const { version } = await fetchLatestBaileysVersion()
  session.snapshot.waVersion = version.join(".")

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: true,
  })

  session.sock = sock

  sock.ev.on("creds.update", async () => {
    if (session.sock !== sock) return
    try {
      await saveCreds()
    } catch (err) {
      console.warn("Failed to save encrypted WhatsApp creds:", err)
    }
  })

  sock.ev.on("connection.update", async (update) => {
    if (session.sock !== sock) return
    const { connection, lastDisconnect, qr } = update

    // 1. Authorized QR string received from WhatsApp servers
    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 280,
          margin: 2,
          color: {
            dark: "#111827",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        })
        session.snapshot.qrString = qr
        session.snapshot.qrDataUrl = qrDataUrl
        session.snapshot.qrGeneratedAt = Date.now()

        if (
          session.requestedPairingPhone &&
          !session.pairingCodeRequested &&
          !sock.authState.creds.registered
        ) {
          session.pairingCodeRequested = true
          try {
            const rawCode = await sock.requestPairingCode(session.requestedPairingPhone)
            const formatted = formatPairingCode(rawCode)
            session.snapshot.pairingCode = formatted
            session.snapshot.phoneNumber = `+${session.requestedPairingPhone}`
            session.snapshot.status = "PAIRING_CODE_READY"
          } catch (pairErr: any) {
            session.snapshot.lastError =
              pairErr?.message || "WhatsApp rejected pairing code request. Verify country code + digits."
            session.snapshot.status = "QR_READY"
          }
        } else if (!session.snapshot.pairingCode) {
          session.snapshot.status = "QR_READY"
        }
        notifyWaiters(session)
      } catch (qrErr: any) {
        session.snapshot.lastError = qrErr?.message || "Failed to encode WhatsApp QR code"
        session.snapshot.status = "ERROR"
        notifyWaiters(session)
      }
    }

    // 2. Socket authenticated & opened successfully
    if (connection === "open") {
      const jid = sock.user?.id || null
      const phoneDigits = jid ? jid.split(":")[0].split("@")[0] : session.requestedPairingPhone
      const formattedPhone = phoneDigits ? `+${phoneDigits}` : session.snapshot.phoneNumber || ""

      session.snapshot.status = "CONNECTED"
      session.snapshot.connectedJid = jid
      session.snapshot.connectedName = sock.user?.name || "WhatsApp Account"
      session.snapshot.phoneNumber = formattedPhone
      session.snapshot.qrString = null
      session.snapshot.qrDataUrl = null
      session.snapshot.pairingCode = null
      session.snapshot.lastError = null

      let discoveredGroups: DiscoveredWhatsAppGroup[] = []
      try {
        discoveredGroups = await fetchParticipatingCommunitiesAndGroups(sock)
        session.snapshot.groups = discoveredGroups
      } catch (grpErr) {
        console.warn("Could not fetch participating WhatsApp communities/groups:", grpErr)
      }

      if (session.userId) {
        await persistConnectedStateToDb(session.userId, formattedPhone, discoveredGroups)
        // Process any recent group/community messages already buffered from initial handshake
        await runBufferedHistorySync(session)
      }
      notifyWaiters(session)
    }

    // 3. Connection closed
    if (connection === "close") {
      if (session.isStopping) {
        session.snapshot.status = "DISCONNECTED"
        notifyWaiters(session)
        return
      }

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut
      const isRestartRequired = statusCode === DisconnectReason.restartRequired

      if (isRestartRequired) {
        try {
          await launchSocket(session)
        } catch (err: any) {
          session.snapshot.status = "ERROR"
          session.snapshot.lastError = err?.message || "Failed to restart WhatsApp stream"
          notifyWaiters(session)
        }
        return
      }

      if (isLoggedOut) {
        fs.rmSync(session.authDir, { recursive: true, force: true })
        session.sock = null
        session.bufferedMessages = []
        session.snapshot = {
          ...createEmptySnapshot(session.sessionKey),
          status: "DISCONNECTED",
        }
        if (session.userId) {
          await persistDisconnectedStateToDb(session.userId)
        }
        notifyWaiters(session)
        return
      }

      if (sock.authState.creds.registered) {
        setTimeout(() => {
          if (!session.isStopping) {
            launchSocket(session).catch(() => {})
          }
        }, 2500)
      } else {
        session.snapshot.status = "DISCONNECTED"
        session.snapshot.lastError =
          (lastDisconnect?.error as Error)?.message ||
          "QR / pairing session expired. Click Refresh to generate a new one."
        notifyWaiters(session)
      }
    }
  })

  // 4. Buffer recent history messages from Communities & Study Groups delivered on initial link
  sock.ev.on("messaging-history.set", async ({ messages }) => {
    if (session.sock !== sock || !Array.isArray(messages)) return
    const cutoffMs = Date.now() - HISTORY_WINDOW_MS

    for (const msg of messages) {
      try {
        const remoteJid = msg.key?.remoteJid || ""
        if (!remoteJid.endsWith("@g.us")) continue

        const rawTs = Number(msg.messageTimestamp || 0)
        const tsMs = rawTs > 1e12 ? rawTs : rawTs * 1000
        if (tsMs && tsMs < cutoffMs) continue

        const parsed = parseBaileysMessageContent(msg)
        if (!parsed.text) continue

        const keyId = msg.key?.id || `${remoteJid}_${tsMs}`
        if (session.bufferedMessages.some((b) => b.keyId === keyId)) continue

        session.bufferedMessages.push({
          keyId,
          remoteJid,
          senderName: msg.pushName || msg.key?.participant?.split("@")[0] || "Community Member",
          text: parsed.text,
          attachmentName: parsed.attachmentName,
          attachmentMime: parsed.attachmentMime,
          timestampMs: tsMs || Date.now(),
        })
      } catch {
        // ignore malformed historical message
      }
    }

    if (session.bufferedMessages.length > MAX_BUFFERED_MESSAGES) {
      session.bufferedMessages = session.bufferedMessages
        .sort((a, b) => a.timestampMs - b.timestampMs)
        .slice(-MAX_BUFFERED_MESSAGES)
    }
    session.snapshot.bufferedMessageCount = session.bufferedMessages.length

    if (session.userId && session.snapshot.status === "CONNECTED") {
      await runBufferedHistorySync(session)
    }
  })

  // 5. Real-time incoming group & community message extraction
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (session.sock !== sock) return

    for (const msg of messages) {
      try {
        const remoteJid = msg.key?.remoteJid || ""
        if (!remoteJid.endsWith("@g.us")) continue

        const parsed = parseBaileysMessageContent(msg)
        if (!parsed.text) continue

        const rawTs = Number(msg.messageTimestamp || 0)
        const tsMs = rawTs > 1e12 ? rawTs : rawTs ? rawTs * 1000 : Date.now()

        const item: BufferedWaMessage = {
          keyId: msg.key?.id || `${remoteJid}_${tsMs}`,
          remoteJid,
          senderName:
            msg.pushName ||
            (msg.key?.fromMe ? session.snapshot.connectedName || "Me" : msg.key?.participant?.split("@")[0]) ||
            "Classmate",
          text: parsed.text,
          attachmentName: parsed.attachmentName,
          attachmentMime: parsed.attachmentMime,
          timestampMs: tsMs,
        }

        if (!session.bufferedMessages.some((b) => b.keyId === item.keyId)) {
          session.bufferedMessages.push(item)
          if (session.bufferedMessages.length > MAX_BUFFERED_MESSAGES) {
            session.bufferedMessages = session.bufferedMessages.slice(-MAX_BUFFERED_MESSAGES)
          }
          session.snapshot.bufferedMessageCount = session.bufferedMessages.length
        }

        // Only live 'notify' events trigger instant DB extraction (append history is synced cleanly via runBufferedHistorySync)
        if (type === "notify" && session.userId) {
          await processAcademicMessageForUser(session, item)
        }
      } catch (msgErr) {
        console.warn("Error processing incoming WhatsApp community/group message:", msgErr)
      }
    }
  })
}

async function waitForHandshakeOutput(
  session: InternalSession,
  mode: "QR" | "CODE",
  timeoutMs = 15000
): Promise<WhatsAppSessionSnapshot> {
  const isSatisfied = () => {
    const s = session.snapshot
    if (s.status === "CONNECTED" || s.status === "ERROR" || s.status === "DISCONNECTED") return true
    if (mode === "CODE") return Boolean(s.pairingCode || s.lastError)
    return Boolean(s.qrDataUrl)
  }

  if (isSatisfied()) {
    return { ...session.snapshot }
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      resolve()
    }, timeoutMs)

    const checkAndResolve = () => {
      if (isSatisfied()) {
        clearTimeout(timer)
        resolve()
      } else {
        session.waiters.push(checkAndResolve)
      }
    }

    session.waiters.push(checkAndResolve)
  })

  return { ...session.snapshot }
}

export async function startWhatsAppSession(params: {
  sessionKey: string
  userId?: string | null
  mode?: "QR" | "CODE"
  phoneNumber?: string
  forceFresh?: boolean
}): Promise<WhatsAppSessionSnapshot> {
  const { sessionKey, userId = null, mode = "QR", phoneNumber = "", forceFresh = false } = params
  const session = getOrCreateInternalSession(sessionKey, userId)

  const sanitizedPhone = phoneNumber.replace(/\D/g, "")
  if (mode === "CODE" && (sanitizedPhone.length < 8 || sanitizedPhone.length > 15)) {
    throw new Error(
      "Please enter a valid WhatsApp phone number with country code (8-15 digits, e.g. +923001234567)."
    )
  }

  if (session.snapshot.status === "CONNECTED" && !forceFresh) {
    return { ...session.snapshot }
  }

  const hasActiveSocket =
    Boolean(session.sock) &&
    session.snapshot.status !== "DISCONNECTED" &&
    session.snapshot.status !== "ERROR"

  const needsNewSocket =
    forceFresh ||
    !hasActiveSocket ||
    (mode === "CODE" && (!session.snapshot.pairingCode || session.requestedPairingPhone !== sanitizedPhone)) ||
    (mode === "QR" && !session.snapshot.qrDataUrl)

  if (needsNewSocket) {
    if (forceFresh || mode === "CODE" || !hasActiveSocket) {
      session.isStopping = true
      teardownSocket(session)
      if (forceFresh || mode === "CODE") {
        fs.rmSync(session.authDir, { recursive: true, force: true })
      }
      session.snapshot = createEmptySnapshot(session.sessionKey)
    }

    session.requestedPairingPhone = mode === "CODE" ? sanitizedPhone : null
    session.snapshot.phoneNumber = mode === "CODE" ? `+${sanitizedPhone}` : null
    await launchSocket(session)
  }

  return waitForHandshakeOutput(session, mode, 15000)
}

/**
 * Refreshes live University Communities & Sub-Groups from WhatsApp and extracts any buffered missed notices.
 */
export async function syncWhatsAppCommunitiesAndHistory(
  sessionKey: string,
  userId: string
): Promise<WhatsAppSessionSnapshot> {
  const session = getOrCreateInternalSession(sessionKey, userId)
  if (!session.sock || session.snapshot.status !== "CONNECTED") {
    throw new Error("WhatsApp session is not currently connected. Please link your device first.")
  }

  const discoveredGroups = await fetchParticipatingCommunitiesAndGroups(session.sock)
  session.snapshot.groups = discoveredGroups
  await persistConnectedStateToDb(userId, session.snapshot.phoneNumber || "", discoveredGroups)
  await runBufferedHistorySync(session)
  return { ...session.snapshot }
}

export function getWhatsAppSessionSnapshot(
  sessionKey: string,
  userId?: string | null
): WhatsAppSessionSnapshot {
  const session = getOrCreateInternalSession(sessionKey, userId || null)
  return { ...session.snapshot }
}

export async function disconnectWhatsAppSession(
  sessionKey: string,
  logout = true
): Promise<WhatsAppSessionSnapshot> {
  const store = getSessionStore()
  const safeKey = sanitizeKey(sessionKey)
  const session = store.get(safeKey)

  if (!session) {
    return { ...createEmptySnapshot(safeKey), status: "DISCONNECTED" }
  }

  session.isStopping = true
  if (session.sock) {
    try {
      if (logout && session.snapshot.status === "CONNECTED") {
        await session.sock.logout()
      }
    } catch {
      // ignore
    }
    teardownSocket(session)
  }

  if (logout) {
    fs.rmSync(session.authDir, { recursive: true, force: true })
  }

  if (session.userId) {
    await persistDisconnectedStateToDb(session.userId)
  }

  session.bufferedMessages = []
  session.snapshot = {
    ...createEmptySnapshot(safeKey),
    status: "DISCONNECTED",
  }
  notifyWaiters(session)
  return { ...session.snapshot }
}

export async function promoteOnboardingWhatsAppSession(
  onboardingKey: string,
  userId: string
): Promise<WhatsAppSessionSnapshot | null> {
  const store = getSessionStore()
  const safeOnboardKey = sanitizeKey(onboardingKey)
  const safeUserKey = sanitizeKey(`user-${userId}`)
  const onboardSession = store.get(safeOnboardKey)

  if (!onboardSession) {
    return null
  }

  onboardSession.userId = userId
  onboardSession.sessionKey = safeUserKey
  store.delete(safeOnboardKey)
  store.set(safeUserKey, onboardSession)

  if (onboardSession.snapshot.status === "CONNECTED") {
    await persistConnectedStateToDb(
      userId,
      onboardSession.snapshot.phoneNumber || "",
      onboardSession.snapshot.groups
    )
    await runBufferedHistorySync(onboardSession)
  }

  return { ...onboardSession.snapshot }
}
