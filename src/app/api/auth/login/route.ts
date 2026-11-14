import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  verifyPassword,
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/security"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const body = await req.json()
    const { email, password } = body

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Please provide both student email and password." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Brute-force rate limit: max 12 login attempts per 15 min per IP + email
    const rate = checkRateLimit(`login:${ip}:${normalizedEmail}`, 12, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rate.retryAfterSeconds}s before trying again.`,
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password. Please verify your credentials." },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password. Please verify your credentials." },
        { status: 401 }
      )
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email!,
      name: user.name || "Student",
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
      message: "Signed in successfully.",
    })

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...getSessionCookieOptions(req, 30 * 24 * 60 * 60),
    })

    return response
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error)
    return NextResponse.json(
      { error: "Failed to process login." },
      { status: 500 }
    )
  }
}
