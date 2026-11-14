import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"
import { NextRequest } from "next/server"

const SECRET_FILE_PATH = path.join(os.tmpdir(), ".scholaros-instance-secret")

declare global {
  // eslint-disable-next-line no-var
  var __scholarosServerSecret: string | undefined
  // eslint-disable-next-line no-var
  var __scholarosRateLimitMap: Map<string, number[]> | undefined
}

/**
 * Returns a strong cryptographic server secret (never a static hardcoded string in source code).
 * Uses AUTH_SECRET / NEXTAUTH_SECRET when configured, or a per-instance CSPRNG secret stored 0o600.
 */
export function getServerSecret(): string {
  const envSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (envSecret && envSecret.trim().length >= 16) {
    return envSecret.trim()
  }

  if (globalThis.__scholarosServerSecret) {
    return globalThis.__scholarosServerSecret
  }

  try {
    if (fs.existsSync(SECRET_FILE_PATH)) {
      const existing = fs.readFileSync(SECRET_FILE_PATH, "utf-8").trim()
      if (existing.length >= 32) {
        globalThis.__scholarosServerSecret = existing
        return existing
      }
    }
  } catch {
    // ignore read error and generate new
  }

  const generated = crypto.randomBytes(32).toString("hex")
  try {
    fs.writeFileSync(SECRET_FILE_PATH, generated, { encoding: "utf-8", mode: 0o600 })
    fs.chmodSync(SECRET_FILE_PATH, 0o600)
  } catch {
    // ignore filesystem restrictions in read-only environments; still cached in memory
  }

  globalThis.__scholarosServerSecret = generated
  return generated
}

/**
 * Constant-time string equality check resistant to length & timing side-channels.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (!a || !b) return false
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest()
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

/**
 * Verifies Meta WhatsApp Cloud API X-Hub-Signature-256 header against raw request body.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false
  const prefix = "sha256="
  if (!signatureHeader.startsWith(prefix)) return false
  const expected =
    prefix + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")
  return timingSafeEqualString(signatureHeader.trim(), expected)
}

/**
 * Generates a high-entropy CSPRNG token for webhooks or CSRF/session IDs.
 */
export function generateSecureToken(prefix = "scholaros", bytes = 16): string {
  return `${prefix}_${crypto.randomBytes(bytes).toString("hex")}`
}

/**
 * Extracts client IP address safely for rate limiting.
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "local-client"
}

/**
 * Sliding-window in-memory rate limiter for auth, upload, webhook, and onboarding routes.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  if (!globalThis.__scholarosRateLimitMap) {
    globalThis.__scholarosRateLimitMap = new Map<string, number[]>()
  }
  const store = globalThis.__scholarosRateLimitMap
  const now = Date.now()
  const cutoff = now - windowMs

  // Occasional pruning so map stays bounded
  if (store.size > 5000) {
    for (const [k, timestamps] of store.entries()) {
      const valid = timestamps.filter((t) => t > cutoff)
      if (valid.length === 0) store.delete(k)
      else store.set(k, valid)
    }
  }

  const timestamps = (store.get(key) || []).filter((t) => t > cutoff)
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    store.set(key, timestamps)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  timestamps.push(now)
  store.set(key, timestamps)
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - timestamps.length),
    retryAfterSeconds: 0,
  }
}

/**
 * Sanitizes URLs stored in DB (allows only http:, https:, or safe local /uploads/ paths).
 */
export function sanitizeSafeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/uploads/") && !trimmed.includes("..")) {
    return trimmed.slice(0, 500)
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString().slice(0, 500)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Creates a deterministic SHA-256 fingerprint for deduplicating extracted WhatsApp items.
 */
export function createContentFingerprint(parts: string[]): string {
  const normalized = parts
    .map((p) => p.toLowerCase().replace(/\s+/g, " ").trim())
    .join("|")
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 32)
}
