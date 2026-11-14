import { NextRequest, NextResponse } from "next/server"
import { ensureGuestUser } from "@/lib/guest-user"
import {
  disconnectWhatsAppSession,
  getWhatsAppSessionSnapshot,
  startWhatsAppSession,
} from "@/lib/whatsapp-manager"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const session = getWhatsAppSessionSnapshot(`user-${userId}`, userId)
    return NextResponse.json({ success: true, session })
  } catch (err: any) {
    const status = err?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: err.message || "Failed to read WhatsApp session" }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json().catch(() => ({}))
    const { action = "start", mode = "QR", phoneNumber = "", forceFresh = false } = body

    const sessionKey = `user-${userId}`

    if (action === "disconnect") {
      const session = await disconnectWhatsAppSession(sessionKey, true)
      return NextResponse.json({ success: true, session })
    }

    const session = await startWhatsAppSession({
      sessionKey,
      userId,
      mode: mode === "CODE" ? "CODE" : "QR",
      phoneNumber: typeof phoneNumber === "string" ? phoneNumber : "",
      forceFresh: Boolean(forceFresh || action === "refresh"),
    })

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (err: any) {
    console.error("POST /api/whatsapp/session error:", err)
    const status = err?.message?.includes("Unauthorized")
      ? 401
      : err?.message?.includes("phone number")
      ? 400
      : 500
    return NextResponse.json({ error: err.message || "WhatsApp connection failed" }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const session = await disconnectWhatsAppSession(`user-${userId}`, true)
    return NextResponse.json({ success: true, session })
  } catch (err: any) {
    const status = err?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: err.message || "Failed to disconnect WhatsApp" }, { status })
  }
}
