import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSessionSnapshot, startWhatsAppSession } from "@/lib/whatsapp-manager"
import { checkRateLimit, getClientIp } from "@/lib/security"

function isValidOnboardingId(id: string | null): id is string {
  return Boolean(id && /^[a-zA-Z0-9_-]{8,64}$/.test(id))
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rate = checkRateLimit(`wa_onboard_get:${ip}`, 120, 5 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for onboarding status polling." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    )
  }

  const { searchParams } = new URL(req.url)
  const onboardingId = searchParams.get("onboardingId")

  if (!isValidOnboardingId(onboardingId)) {
    return NextResponse.json({ error: "Invalid onboarding session ID" }, { status: 400 })
  }

  const session = getWhatsAppSessionSnapshot(`onboard-${onboardingId}`, null)
  return NextResponse.json({ success: true, session })
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rate = checkRateLimit(`wa_onboard_post:${ip}`, 20, 5 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many WhatsApp pairing requests. Please retry in ${rate.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    const body = await req.json()
    const { onboardingId, mode = "QR", phoneNumber = "", forceFresh = false } = body

    if (!isValidOnboardingId(onboardingId)) {
      return NextResponse.json({ error: "Invalid onboarding session ID" }, { status: 400 })
    }

    const session = await startWhatsAppSession({
      sessionKey: `onboard-${onboardingId}`,
      userId: null,
      mode: mode === "CODE" ? "CODE" : "QR",
      phoneNumber: typeof phoneNumber === "string" ? phoneNumber : "",
      forceFresh: Boolean(forceFresh),
    })

    return NextResponse.json({ success: true, session })
  } catch (err: any) {
    console.error("POST /api/whatsapp/onboarding error:", err)
    const status = err?.message?.includes("phone number") ? 400 : 500
    return NextResponse.json(
      { error: err.message || "Failed to start WhatsApp onboarding session" },
      { status }
    )
  }
}
