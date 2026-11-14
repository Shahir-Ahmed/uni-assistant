import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { extractFromWhatsApp, syncWhatsAppExtractionToDb, WhatsAppSyncConfig } from "@/lib/whatsapp-extractor"
import { checkRateLimit, getClientIp, timingSafeEqualString, verifyMetaSignature } from "@/lib/security"

const LEGACY_REVOKED_TOKENS = new Set(["scholaros_wa_sec_token_2026"])

function isValidTokenShape(token: string): boolean {
  return typeof token === "string" && token.length >= 24 && !LEGACY_REVOKED_TOKENS.has(token)
}

/**
 * GET Webhook Verification for Meta WhatsApp Cloud API
 * Constant-time comparison against configured WHATSAPP_VERIFY_TOKEN or per-student CSPRNG webhookVerifyToken.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token") || ""
  const challenge = searchParams.get("hub.challenge") || ""

  if (mode !== "subscribe" || !isValidTokenShape(token)) {
    return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 })
  }

  const envGlobalToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (envGlobalToken && isValidTokenShape(envGlobalToken) && timingSafeEqualString(token, envGlobalToken)) {
    return new Response(challenge, { status: 200 })
  }

  const prefs = await prisma.preference.findMany({
    where: { key: "whatsapp_config" },
    select: { value: true },
  })

  const matched = prefs.some((p) => {
    const cfg = p.value as unknown as WhatsAppSyncConfig
    return Boolean(
      cfg?.permissionGranted &&
        cfg?.webhookVerifyToken &&
        isValidTokenShape(cfg.webhookVerifyToken) &&
        timingSafeEqualString(cfg.webhookVerifyToken, token)
    )
  })

  if (matched) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 })
}

/**
 * POST Webhook Handler for incoming WhatsApp messages.
 * Strictly requires EITHER valid Meta X-Hub-Signature-256 HMAC OR a valid per-student CSPRNG verify token.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rate = checkRateLimit(`wa_webhook:${ip}`, 60, 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json({ error: "Webhook rate limit exceeded" }, { status: 429 })
    }

    const rawBody = await req.text()
    if (!rawBody || rawBody.length > 256 * 1024) {
      return NextResponse.json({ error: "Invalid webhook payload size" }, { status: 400 })
    }

    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "Malformed JSON webhook body" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const tokenParam =
      req.headers.get("x-webhook-token") ||
      searchParams.get("token") ||
      (typeof body.verifyToken === "string" ? body.verifyToken : "")

    const appSecret = process.env.WHATSAPP_APP_SECRET || ""
    const signatureHeader = req.headers.get("x-hub-signature-256")
    const hasValidMetaHmac = Boolean(
      appSecret && signatureHeader && verifyMetaSignature(rawBody, signatureHeader, appSecret)
    )

    if (!hasValidMetaHmac && !isValidTokenShape(tokenParam)) {
      return NextResponse.json(
        { error: "Unauthorized webhook request: missing cryptographic signature or valid verify token." },
        { status: 401 }
      )
    }

    let messageText = ""
    let senderName = "WhatsApp Community"
    let groupName = "WhatsApp Study Group"
    let targetPhone = ""
    let waMessageKey = ""

    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change.value
          if (value?.messages && value.messages[0]) {
            const msg = value.messages[0]
            messageText = msg.text?.body || msg.caption || msg.document?.caption || ""
            waMessageKey = msg.id || ""
            senderName = value.contacts?.[0]?.profile?.name || msg.from || "Classmate"
            targetPhone = value.metadata?.display_phone_number || msg.from || ""
            groupName = value.metadata?.phone_number_id
              ? `Group (${value.metadata.phone_number_id})`
              : "Class Group"
          }
        }
      }
    } else if (body.text || body.message) {
      messageText = String(body.text || body.message)
      senderName = String(body.sender || body.from || "Classmate")
      groupName = String(body.group || body.groupName || "University Community")
      targetPhone = String(body.pairedPhone || body.to || "")
      waMessageKey = typeof body.messageId === "string" ? body.messageId : ""
    }

    if (!messageText.trim()) {
      return NextResponse.json({ received: true, ignored: "No text found" })
    }

    const prefs = await prisma.preference.findMany({
      where: { key: "whatsapp_config" },
      select: { userId: true, value: true },
    })

    let targetUserId: string | null = null
    let matchedConfig: WhatsAppSyncConfig | undefined

    for (const pref of prefs) {
      const cfg = pref.value as unknown as WhatsAppSyncConfig
      if (!cfg?.permissionGranted) continue

      if (
        isValidTokenShape(tokenParam) &&
        cfg.webhookVerifyToken &&
        isValidTokenShape(cfg.webhookVerifyToken) &&
        timingSafeEqualString(cfg.webhookVerifyToken, tokenParam)
      ) {
        targetUserId = pref.userId
        matchedConfig = cfg
        break
      }

      // Phone matching is ONLY permitted when request already passed Meta Cloud API X-Hub-Signature-256 HMAC verification
      if (
        hasValidMetaHmac &&
        targetPhone &&
        cfg.pairedPhone &&
        cfg.pairedPhone.replace(/\D/g, "") === targetPhone.replace(/\D/g, "")
      ) {
        targetUserId = pref.userId
        matchedConfig = cfg
        break
      }
    }

    if (!targetUserId || !matchedConfig) {
      return NextResponse.json(
        { error: "Unauthorized or unmatched WhatsApp webhook token." },
        { status: 403 }
      )
    }

    const studentSubjects = await prisma.subject.findMany({
      where: { userId: targetUserId, isArchived: false },
      select: { id: true, name: true, code: true },
    })

    const extraction = await extractFromWhatsApp(messageText, groupName, studentSubjects)
    const syncRes = await syncWhatsAppExtractionToDb(
      targetUserId,
      extraction,
      messageText,
      groupName,
      senderName,
      {
        waMessageKey: waMessageKey || undefined,
        respectConfigRules: true,
        config: matchedConfig,
      }
    )

    return NextResponse.json({
      received: true,
      synced: Boolean(syncRes.success && !syncRes.skipped),
      duplicate: Boolean((syncRes as any).duplicate),
      classification: extraction.classification,
      title: extraction.title,
    })
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
