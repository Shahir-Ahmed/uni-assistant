import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth"
import { ensureGuestUser } from "@/lib/guest-user"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, isDemo } = body

    // 1. One-click Demo Student Login
    if (isDemo) {
      const guestId = await ensureGuestUser()
      const demoUser = await prisma.user.findUnique({
        where: { id: guestId },
        select: { id: true, name: true, email: true },
      })

      if (!demoUser) {
        return NextResponse.json({ error: "Demo user not available." }, { status: 500 })
      }

      const token = createSessionToken({
        id: demoUser.id,
        email: demoUser.email || "demo@scholar-os.local",
        name: demoUser.name || "Demo Student",
      })

      const response = NextResponse.json({
        user: demoUser,
        message: "Signed in to demo student workspace.",
      })

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      })

      return response
    }

    // 2. Standard Student Login
    if (!email || !password) {
      return NextResponse.json(
        { error: "Please provide both student email and password." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
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
      message: "Signed in successfully.",
    })

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process login." },
      { status: 500 }
    )
  }
}
