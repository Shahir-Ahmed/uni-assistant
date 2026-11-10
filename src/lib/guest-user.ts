import { NextRequest } from "next/server"
import { getCurrentUserId, getAuthenticatedUser } from "./auth"

export const GUEST_USER_ID = "guest-user-scholar-os"

/**
 * Resolves current user ID from incoming request.
 * If user is authenticated via session cookie or Authorization header, returns their real userId.
 * Otherwise falls back to guest user ID.
 */
export async function ensureGuestUser(req?: Request | NextRequest | null): Promise<string> {
  return getCurrentUserId(req)
}

export async function getCurrentUser(req?: Request | NextRequest | null) {
  return getAuthenticatedUser(req)
}
