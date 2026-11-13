import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { extractFromWhatsApp, syncWhatsAppExtractionToDb, WhatsAppSyncConfig } from "@/lib/whatsapp-extractor"

/**
 * GET Webhook Verification for Meta WhatsApp Cloud API
 * Supports both global WHATSAPP_VERIFY_TOKEN and per-student private webhook tokens.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode !== "subscribe" || !token) {
    return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 })
  }

  const expectedGlobalToken = process.env.WHATSAPP_VERIFY_TOKEN || "scholaros_wa_sec_token_2026"
  if (token === expectedGlobalToken) {
    return new Response(challenge, { status: 200 })
  }

  // Check per-student private webhookVerifyToken
  const prefs = await prisma.preference.findMany({
    where: { key: "whatsapp_config" },
    select: { value: true },
  })

  const matched = prefs.some((p) => {
    const cfg = p.value as unknown as WhatsAppSyncConfig
    return cfg?.webhookVerifyToken === token
  })

  if (matched) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 })
}

/**
 * POST Webhook Handler for incoming WhatsApp group messages
 * Routes to the matching student's private workspace based on verify token or phone number.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { searchParams } = new URL(req.url)
    const tokenParam = searchParams.get("token") || body.verifyToken || ""

    // Determine incoming message text and sender
    let messageText = ""
    let senderName = "WhatsApp Community"
    let groupName = "WhatsApp Study Group"
    let targetPhone = ""

    // 1. Check for Meta Cloud API format
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change.value
          if (value?.messages && value.messages[0]) {
            const msg = value.messages[0]
            messageText = msg.text?.body || msg.caption || ""
            senderName = value.contacts?.[0]?.profile?.name || msg.from || "Classmate"
            targetPhone = value.metadata?.display_phone_number || msg.from || ""
            groupName = value.metadata?.phone_number_id ? `Group (${value.metadata.phone_number_id})` : "Class Group"
          }
        }
      }
    }
    // 2. Check for simplified standard webhook format
    else if (body.text || body.message) {
      messageText = body.text || body.message
      senderName = body.sender || body.from || "Classmate"
      groupName = body.group || body.groupName || "University Community"
      targetPhone = body.pairedPhone || body.to || ""
    }

    if (!messageText.trim()) {
      return NextResponse.json({ received: true, ignored: "No text found" })
    }

    // Match the exact private student workspace by verify token or paired phone number
    const prefs = await prisma.preference.findMany({
      where: { key: "whatsapp_config" },
      select: { userId: true, value: true },
    })

    let targetUserId: string | null = null
    for (const pref of prefs) {
      const cfg = pref.value as unknown as WhatsAppSyncConfig
      if (!cfg?.permissionGranted) continue
      if (tokenParam && cfg.webhookVerifyToken === tokenParam) {
        targetUserId = pref.userId
        break
      }
      if (targetPhone && cfg.pairedPhone && cfg.pairedPhone.replace(/\D/g, "") === targetPhone.replace(/\D/g, "")) {
        targetUserId = pref.userId
        break
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { received: true, ignored: "No authorized private student workspace matched this webhook." },
        { status: 200 }
      )
    }

    const studentSubjects = await prisma.subject.findMany({
      where: { userId: targetUserId, isArchived: false },
      select: { id: true, name: true, code: true },
    })

    const extraction = await extractFromWhatsApp(messageText, groupName, studentSubjects)

    let synced = false
    if (extraction.isAcademic && extraction.classification !== "CHIT_CHAT") {
      await syncWhatsAppExtractionToDb(targetUserId, extraction, messageText, groupName, senderName)
      synced = true
    }

    return NextResponse.json({
      received: true,
      synced,
      classification: extraction.classification,
      title: extraction.title,
    })
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err)
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 })
  }
}
