import fs from "fs"
import os from "os"
import path from "path"
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState as initMultiFileAuthState,
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
  WhatsAppSyncConfig,
} from "@/lib/whatsapp-extractor"

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
  participantsCount: number
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
  lastError: string | null
  qrGeneratedAt: number | null
  updatedAt: string
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
  waiters: Array<() => void>
}

const SESSIONS_ROOT = path.join(os.tmpdir(), "scholaros-whatsapp-sessions")

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
    lastError: null,
    qrGeneratedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

function notifyWaiters(session: InternalSession) {
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

function extractMessageText(msg: any): string {
  if (!msg?.message) return ""
  const m = msg.message
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ""
  )
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
    const currentCfg =
      (existing?.value as unknown as WhatsAppSyncConfig) || { ...DEFAULT_WHATSAPP_CONFIG }

    // Merge discovered WhatsApp groups with existing tracked rules
    const existingByName = new Map(
      (currentCfg.groups || []).map((g) => [g.name.toLowerCase(), g])
    )
    const palette = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0D9488", "#DC2626"]
    const mergedGroups: WhatsAppGroupConfig[] = [...(currentCfg.groups || [])]

    discoveredGroups.forEach((dg, idx) => {
      if (!existingByName.has(dg.subject.toLowerCase())) {
        const codeMatch = dg.subject.match(/\b([A-Z]{2,5}[-\s]?\d{3})\b/i)
        mergedGroups.unshift({
          id: dg.id,
          name: dg.subject,
          subjectCode: codeMatch ? codeMatch[1].toUpperCase().replace(/\s+/, "-") : "GENERAL",
          autoSync: true,
          messageCount: 0,
          lastActive: "Connected via WhatsApp",
          color: palette[idx % palette.length],
        })
      }
    })

    const nextCfg: WhatsAppSyncConfig = {
      ...currentCfg,
      status: "CONNECTED",
      permissionGranted: true,
      permissionGrantedAt: currentCfg.permissionGrantedAt || new Date().toISOString(),
      pairedPhone: phone || currentCfg.pairedPhone,
      pairedAt: new Date().toISOString(),
      groups: mergedGroups.slice(0, 30),
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

function getOrCreateInternalSession(sessionKey: string, userId: string | null = null): InternalSession {
  const store = getSessionStore()
  const safeKey = sanitizeKey(sessionKey)
  let session = store.get(safeKey)

  if (!session) {
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
      waiters: [],
    }
    store.set(safeKey, session)
  } else if (userId && !session.userId) {
    session.userId = userId
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
    oldSock.end(undefined)
  } catch {
    // ignore socket teardown errors
  }
}

async function launchSocket(session: InternalSession) {
  fs.mkdirSync(session.authDir, { recursive: true })

  // Close previous socket gracefully with listeners removed before creating new one
  teardownSocket(session)

  session.isStopping = false
  session.pairingCodeRequested = false
  session.snapshot.status = "INITIALIZING"
  session.snapshot.lastError = null
  notifyWaiters(session)

  const { state, saveCreds } = await initMultiFileAuthState(session.authDir)
  const { version } = await fetchLatestBaileysVersion()
  session.snapshot.waVersion = version.join(".")

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  })

  session.sock = sock

  sock.ev.on("creds.update", async () => {
    if (session.sock !== sock) return
    try {
      await saveCreds()
    } catch (err) {
      console.warn("Failed to save WhatsApp creds:", err)
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

        // If user requested Phone Pairing Code mode, request official pairing code right after Noise handshake
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

      // Fetch real participating groups from WhatsApp
      let discoveredGroups: DiscoveredWhatsAppGroup[] = []
      try {
        const groupMap = await sock.groupFetchAllParticipating()
        discoveredGroups = Object.values(groupMap).map((g: any) => ({
          id: g.id,
          subject: g.subject || "WhatsApp Group",
          participantsCount: Array.isArray(g.participants) ? g.participants.length : 0,
        }))
        session.snapshot.groups = discoveredGroups
      } catch (grpErr) {
        console.warn("Could not fetch participating WhatsApp groups:", grpErr)
      }

      if (session.userId) {
        await persistConnectedStateToDb(session.userId, formattedPhone, discoveredGroups)
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
        // Standard WhatsApp Multi-Device post-pairing stream restart (code 515)
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

      // If already registered, try auto-reconnecting; if unpaired QR timed out, stop cleanly
      if (sock.authState.creds.registered) {
        setTimeout(() => {
          if (!session.isStopping) {
            launchSocket(session).catch(() => {})
          }
        }, 2500)
      } else {
        session.snapshot.status = "DISCONNECTED"
        session.snapshot.lastError =
          (lastDisconnect?.error as Error)?.message || "QR / pairing session expired. Click Refresh to generate a new one."
        notifyWaiters(session)
      }
    }
  })

  // 4. Real-time incoming group message extraction for authenticated student
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (session.sock !== sock || type !== "notify" || !session.userId) return

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue
        const remoteJid = msg.key.remoteJid || ""
        const text = extractMessageText(msg).trim()
        if (!text) continue

        // Check user's WhatsApp sync permissions
        const pref = await prisma.preference.findUnique({
          where: { userId_key: { userId: session.userId, key: "whatsapp_config" } },
        })
        const cfg = pref?.value as unknown as WhatsAppSyncConfig | undefined
        if (cfg && cfg.permissionGranted === false) continue

        let groupName = "WhatsApp Direct"
        if (remoteJid.endsWith("@g.us")) {
          const cached = session.snapshot.groups.find((g) => g.id === remoteJid)
          if (cached) {
            groupName = cached.subject
          } else {
            try {
              const meta = await sock.groupMetadata(remoteJid)
              groupName = meta.subject || remoteJid
            } catch {
              groupName = remoteJid
            }
          }
        }

        const senderName = msg.pushName || msg.key.participant || remoteJid.split("@")[0] || "Classmate"
        const subjects = await prisma.subject.findMany({
          where: { userId: session.userId, isArchived: false },
          select: { id: true, name: true, code: true },
        })

        const extraction = await extractFromWhatsApp(text, groupName, subjects)
        if (extraction.isAcademic && extraction.classification !== "CHIT_CHAT") {
          await syncWhatsAppExtractionToDb(
            session.userId,
            extraction,
            text,
            groupName,
            senderName
          )
        }
      } catch (msgErr) {
        console.warn("Error processing incoming WhatsApp message:", msgErr)
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
    throw new Error("Please enter a valid WhatsApp phone number with country code (8–15 digits, e.g. +923001234567).")
  }

  // If already connected and not forcing fresh, return live connected snapshot
  if (session.snapshot.status === "CONNECTED" && !forceFresh) {
    return { ...session.snapshot }
  }

  // Reset unpaired auth directory when forcing fresh or switching pairing mode before registration
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
        // Fresh Noise pre-keys ensure pairing code requests are never rejected by stale handshake state
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

export function getWhatsAppSessionSnapshot(sessionKey: string, userId?: string | null): WhatsAppSessionSnapshot {
  const session = getOrCreateInternalSession(sessionKey, userId || null)
  return { ...session.snapshot }
}

export async function disconnectWhatsAppSession(sessionKey: string, logout = true): Promise<WhatsAppSessionSnapshot> {
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
      // ignore logout error if socket already closed
    }
    teardownSocket(session)
  }

  if (logout) {
    fs.rmSync(session.authDir, { recursive: true, force: true })
  }

  if (session.userId) {
    await persistDisconnectedStateToDb(session.userId)
  }

  session.snapshot = {
    ...createEmptySnapshot(safeKey),
    status: "DISCONNECTED",
  }
  notifyWaiters(session)
  return { ...session.snapshot }
}

export async function promoteOnboardingWhatsAppSession(onboardingKey: string, userId: string): Promise<WhatsAppSessionSnapshot | null> {
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
  }

  return { ...onboardSession.snapshot }
}
