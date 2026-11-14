import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE_NAME = "scholaros_session"

const PUBLIC_PAGES = ["/signup", "/login"]
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/whatsapp/webhook",
  "/api/whatsapp/onboarding",
  "/api/cron/",
]

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  return response
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function isValidSessionTokenEdge(token: string | undefined): Promise<boolean> {
  if (!token || token.length > 2048) return false
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const [headerB64, payloadB64, sigB64] = parts
    if (!headerB64 || !payloadB64 || !sigB64) return false

    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json)

    if (!payload?.userId || typeof payload.userId !== "string") return false
    if (payload.iss && payload.iss !== "scholaros") return false
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false
    }

    // Perform full cryptographic HMAC-SHA256 verification at the edge when env secret is configured
    const envSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    if (envSecret && envSecret.trim().length >= 16) {
      const enc = new TextEncoder()
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(envSecret.trim()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      )
      const sigBytes = base64UrlToUint8Array(sigB64)
      const dataBytes = enc.encode(`${headerB64}.${payloadB64}`)
      return await crypto.subtle.verify(
        "HMAC",
        key,
        sigBytes.buffer as ArrayBuffer,
        dataBytes.buffer as ArrayBuffer
      )
    }

    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/i.test(pathname)
  ) {
    return applySecurityHeaders(NextResponse.next())
  }

  // Allow explicitly public endpoints (which perform their own cryptographic / rate-limit checks)
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return applySecurityHeaders(NextResponse.next())
  }

  const bearerHeader = req.headers.get("authorization")
  const bearerToken = bearerHeader?.startsWith("Bearer ") ? bearerHeader.slice(7).trim() : undefined
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value || bearerToken
  const isAuthenticated = await isValidSessionTokenEdge(sessionToken)

  // Allow public auth pages (/signup, /login)
  if (PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))) {
    return applySecurityHeaders(NextResponse.next())
  }

  // Protect all private API endpoints
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Authentication required. Please sign up with WhatsApp permission first." },
          { status: 401 }
        )
      )
    }
    return applySecurityHeaders(NextResponse.next())
  }

  // Protect all workspace pages: require new users to sign up first
  if (!isAuthenticated) {
    const signupUrl = req.nextUrl.clone()
    signupUrl.pathname = "/signup"
    signupUrl.search = ""
    if (pathname && pathname !== "/") {
      signupUrl.searchParams.set("next", pathname)
    }
    return applySecurityHeaders(NextResponse.redirect(signupUrl))
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
