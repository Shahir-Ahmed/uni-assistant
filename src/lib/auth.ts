import { NextRequest } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { getServerSecret } from "./security"

export const SESSION_COOKIE_NAME = "scholaros_session"

export interface SessionPayload {
  userId: string
  email: string
  name: string
  iss?: string
  jti?: string
  iat?: number
  exp: number
}

/**
 * Hash a plain text password with bcrypt (cost 12 for strong brute-force resistance)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/**
 * Compare plain text password against hashed password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a cryptographically signed HMAC-SHA256 session token
 */
export function createSessionToken(user: { id: string; email: string; name: string }): string {
  const secret = getServerSecret()
  const nowSec = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    iss: "scholaros",
    jti: crypto.randomBytes(12).toString("hex"),
    iat: nowSec,
    exp: nowSec + 30 * 24 * 60 * 60, // 30 days
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${encodedPayload}`)
    .digest("base64url")

  return `${header}.${encodedPayload}.${signature}`
}

/**
 * Verify session token and return payload if valid and not expired
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || token.length > 2048) return null
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [header, encodedPayload, signature] = parts
    if (!header || !encodedPayload || !signature) return null

    const secret = getServerSecret()
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${encodedPayload}`)
      .digest("base64url")

    const sigBuf = Buffer.from(signature, "utf8")
    const expBuf = Buffer.from(expectedSignature, "utf8")
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    )
    if (!payload.userId || typeof payload.userId !== "string") {
      return null
    }
    if (payload.iss && payload.iss !== "scholaros") {
      return null
    }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function getSessionCookieOptions(
  req?: Request | NextRequest | null,
  maxAge = 30 * 24 * 60 * 60
) {
  let isHttps = process.env.NODE_ENV === "production"
  if (req) {
    const forwardedProto = req.headers.get("x-forwarded-proto") || ""
    const origin = req.headers.get("origin") || ""
    const referer = req.headers.get("referer") || ""
    if (
      forwardedProto.includes("https") ||
      origin.startsWith("https://") ||
      referer.startsWith("https://") ||
      req.url.startsWith("https://")
    ) {
      isHttps = true
    } else if (req.url.startsWith("http://localhost") || req.url.startsWith("http://127.0.0.1")) {
      isHttps = false
    }
  }

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge,
  }
}

/**
 * Retrieve authenticated user from Request (via Cookie or Authorization header)
 */
export async function getAuthenticatedUser(req?: Request | NextRequest | null): Promise<{
  id: string
  name: string | null
  email: string | null
  timezone: string
} | null> {
  let token: string | null = null

  if (req) {
    const maybeCookies = (req as NextRequest).cookies
    if (maybeCookies && typeof maybeCookies.get === "function") {
      token = maybeCookies.get(SESSION_COOKIE_NAME)?.value || null
    }

    if (!token) {
      const cookieHeader = req.headers.get("cookie") || ""
      for (const part of cookieHeader.split(";")) {
        const trimmed = part.trim()
        if (!trimmed) continue
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx === -1) continue
        const k = trimmed.slice(0, eqIdx).trim()
        if (k === SESSION_COOKIE_NAME) {
          const rawVal = trimmed.slice(eqIdx + 1).trim()
          try {
            token = decodeURIComponent(rawVal)
          } catch {
            token = rawVal
          }
          break
        }
      }
    }

    if (!token) {
      const authHeader = req.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim()
      }
    }
  }

  if (!token) {
    return null
  }

  const payload = verifySessionToken(token)
  if (!payload || !payload.userId) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, timezone: true },
    })
    return user
  } catch (err) {
    console.error("Error looking up authenticated user:", err)
    return null
  }
}

/**
 * Get current authenticated user ID from request.
 * Throws if the request is unauthenticated so every student's data stays strictly isolated.
 */
export async function getCurrentUserId(req?: Request | NextRequest | null): Promise<string> {
  const user = await getAuthenticatedUser(req)
  if (user) {
    return user.id
  }

  if (req) {
    throw new Error("Unauthorized: Please sign up or sign in to access your private workspace.")
  }

  const GUEST_USER_ID = "guest-user-scholar-os"
  const existing = await prisma.user.findUnique({
    where: { id: GUEST_USER_ID },
    select: { id: true },
  })
  if (!existing) {
    await prisma.user.create({
      data: {
        id: GUEST_USER_ID,
        name: "System Student",
        email: "system@scholar-os.local",
        timezone: "Asia/Karachi",
      },
    })
  }
  return GUEST_USER_ID
}
