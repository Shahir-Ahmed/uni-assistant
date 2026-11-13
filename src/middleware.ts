import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE_NAME = "scholaros_session"

const PUBLIC_PAGES = ["/signup", "/login"]
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/whatsapp/webhook",
  "/api/cron/",
]

function hasValidSessionTokenShape(token: string | undefined): boolean {
  if (!token) return false
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    // Decode base64url payload safely in Edge runtime
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json)
    if (!payload?.userId) return false
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Allow public API endpoints (auth routes & external WhatsApp webhook)
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const isAuthenticated = hasValidSessionTokenShape(sessionToken)

  // Allow public auth pages (/signup, /login)
  if (PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))) {
    return NextResponse.next()
  }

  // Protect all private API endpoints
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required. Please sign up with WhatsApp permission first." },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Protect all workspace pages: require new users to sign up first
  if (!isAuthenticated) {
    const signupUrl = new URL("/signup", req.url)
    if (pathname && pathname !== "/") {
      signupUrl.searchParams.set("next", pathname)
    }
    return NextResponse.redirect(signupUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
