import { NextRequest, NextResponse } from "next/server"
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  })

  // Clear session cookie with matching SameSite/Secure flags
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...getSessionCookieOptions(req, 0),
    expires: new Date(0),
  })

  return response
}
