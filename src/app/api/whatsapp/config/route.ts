import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import {
  DEFAULT_WHATSAPP_CONFIG,
  WhatsAppGroupConfig,
  WhatsAppSyncConfig,
} from "@/lib/whatsapp-extractor"
import { generateSecureToken } from "@/lib/security"

function sanitizeGroupList(raw: unknown): WhatsAppGroupConfig[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 60)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((g, idx) => ({
      id: typeof g.id === "string" && g.id.trim() ? g.id.trim().slice(0, 120) : `grp-${idx}`,
      name: typeof g.name === "string" ? g.name.trim().slice(0, 140) : "Study Group",
      subjectCode:
        typeof g.subjectCode === "string" ? g.subjectCode.trim().slice(0, 32) : "GENERAL",
      subjectId: typeof g.subjectId === "string" ? g.subjectId.trim().slice(0, 64) : undefined,
      autoSync: typeof g.autoSync === "boolean" ? g.autoSync : true,
      messageCount: Number.isFinite(Number(g.messageCount)) ? Math.max(0, Number(g.messageCount)) : 0,
      lastActive:
        typeof g.lastActive === "string" ? g.lastActive.trim().slice(0, 60) : "Ready to sync",
      color:
        typeof g.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(g.color.trim())
          ? g.color.trim()
          : "#059669",
      kind:
        g.kind === "COMMUNITY" ||
        g.kind === "COMMUNITY_ANNOUNCEMENTS" ||
        g.kind === "SUBGROUP" ||
        g.kind === "GROUP"
          ? g.kind
          : "GROUP",
      isCommunity: Boolean(g.isCommunity),
      isCommunityAnnounce: Boolean(g.isCommunityAnnounce),
      linkedParentId: typeof g.linkedParentId === "string" ? g.linkedParentId.slice(0, 120) : null,
      linkedParentName:
        typeof g.linkedParentName === "string" ? g.linkedParentName.slice(0, 140) : null,
      participantsCount: Number.isFinite(Number(g.participantsCount))
        ? Math.max(0, Number(g.participantsCount))
        : undefined,
      description: typeof g.description === "string" ? g.description.slice(0, 240) : undefined,
    }))
}

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)

    const pref = await prisma.preference.findUnique({
      where: {
        userId_key: {
          userId,
          key: "whatsapp_config",
        },
      },
    })

    if (!pref) {
      const freshConfig: WhatsAppSyncConfig = {
        ...DEFAULT_WHATSAPP_CONFIG,
        webhookVerifyToken: generateSecureToken("scholaros_wa", 16),
      }
      await prisma.preference.create({
        data: { userId, key: "whatsapp_config", value: freshConfig as any },
      })
      return NextResponse.json({ config: freshConfig })
    }

    const stored = pref.value as unknown as WhatsAppSyncConfig
    if (
      !stored.webhookVerifyToken ||
      stored.webhookVerifyToken.length < 24 ||
      stored.webhookVerifyToken === "scholaros_wa_sec_token_2026"
    ) {
      stored.webhookVerifyToken = generateSecureToken("scholaros_wa", 16)
      await prisma.preference.update({
        where: { userId_key: { userId, key: "whatsapp_config" } },
        data: { value: stored as any },
      })
    }

    return NextResponse.json({ config: stored })
  } catch (err: any) {
    const status = err?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: err.message || "Failed to load config" }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    const { config, action } = body

    const existingPref = await prisma.preference.findUnique({
      where: { userId_key: { userId, key: "whatsapp_config" } },
    })

    const existingCfg: WhatsAppSyncConfig =
      (existingPref?.value as unknown as WhatsAppSyncConfig) || {
        ...DEFAULT_WHATSAPP_CONFIG,
        webhookVerifyToken: generateSecureToken("scholaros_wa", 16),
      }

    // Explicit webhook secret rotation
    if (action === "regenerate_webhook_token") {
      const rotatedCfg: WhatsAppSyncConfig = {
        ...existingCfg,
        webhookVerifyToken: generateSecureToken("scholaros_wa", 16),
      }
      const updatedPref = await prisma.preference.upsert({
        where: { userId_key: { userId, key: "whatsapp_config" } },
        update: { value: rotatedCfg as any },
        create: { userId, key: "whatsapp_config", value: rotatedCfg as any },
      })
      return NextResponse.json({ success: true, config: updatedPref.value })
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "Missing config" }, { status: 400 })
    }

    // Strict allowlist merge: clients cannot tamper with server-managed webhookVerifyToken or status
    const mergedCfg: WhatsAppSyncConfig = {
      ...existingCfg,
      autoSyncAssignments:
        typeof config.autoSyncAssignments === "boolean"
          ? config.autoSyncAssignments
          : existingCfg.autoSyncAssignments,
      autoSyncQuizzes:
        typeof config.autoSyncQuizzes === "boolean"
          ? config.autoSyncQuizzes
          : existingCfg.autoSyncQuizzes,
      autoSyncNotes:
        typeof config.autoSyncNotes === "boolean"
          ? config.autoSyncNotes
          : existingCfg.autoSyncNotes,
      filterChitChat:
        typeof config.filterChitChat === "boolean"
          ? config.filterChitChat
          : existingCfg.filterChitChat,
      permissionGranted:
        typeof config.permissionGranted === "boolean"
          ? config.permissionGranted
          : existingCfg.permissionGranted,
      groups: Array.isArray(config.groups) ? sanitizeGroupList(config.groups) : existingCfg.groups,
      webhookVerifyToken:
        existingCfg.webhookVerifyToken &&
        existingCfg.webhookVerifyToken.length >= 24 &&
        existingCfg.webhookVerifyToken !== "scholaros_wa_sec_token_2026"
          ? existingCfg.webhookVerifyToken
          : generateSecureToken("scholaros_wa", 16),
    }

    const updatedPref = await prisma.preference.upsert({
      where: {
        userId_key: {
          userId,
          key: "whatsapp_config",
        },
      },
      update: {
        value: mergedCfg as any,
      },
      create: {
        userId,
        key: "whatsapp_config",
        value: mergedCfg as any,
      },
    })

    return NextResponse.json({
      success: true,
      config: updatedPref.value,
    })
  } catch (err: any) {
    console.error("POST /api/whatsapp/config error:", err)
    const status = err?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: err.message || "Failed to update configuration" }, { status })
  }
}
