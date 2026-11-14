import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { writeFile, mkdir, chmod } from "fs/promises"
import path from "path"
import { ensureGuestUser } from "@/lib/guest-user"
import { checkRateLimit } from "@/lib/security"

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

// Explicitly block active web content (.svg, .html, .htm, .js, .php, .sh) to prevent stored XSS / RCE
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
])

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)

    const rate = checkRateLimit(`upload:${userId}`, 25, 5 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Upload rate limit exceeded. Try again in ${rate.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 15 MB." },
        { status: 413 }
      )
    }

    const originalBase = path.basename(file.name || "document.txt")
    const ext = path.extname(originalBase).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported or restricted file type (${ext || "unknown"}). Allowed formats: PDF, Office docs, TXT, MD, CSV, JSON, PNG, JPG, WEBP, GIF.`,
        },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const safeUserDirName = userId.replace(/[^a-zA-Z0-9_-]/g, "_")
    const userUploadsDir = path.resolve(process.cwd(), "public", "uploads", safeUserDirName)
    await mkdir(userUploadsDir, { recursive: true, mode: 0o750 })

    const safeStem = path
      .basename(originalBase, ext)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 64) || "file"
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeStem}${ext}`
    const filePath = path.resolve(userUploadsDir, fileName)

    // Path traversal guard
    if (!filePath.startsWith(userUploadsDir + path.sep)) {
      return NextResponse.json({ error: "Invalid upload file path" }, { status: 400 })
    }

    await writeFile(filePath, buffer, { mode: 0o640 })
    await chmod(filePath, 0o640).catch(() => {})

    const fileUrl = `/uploads/${safeUserDirName}/${fileName}`

    let extractedText = ""
    const isTextFile =
      (file.type && file.type.startsWith("text/") && !file.type.includes("html")) ||
      /\.(txt|md|markdown|json|csv|tsv)$/i.test(originalBase)

    if (isTextFile) {
      extractedText = buffer.toString("utf-8").slice(0, 100000)
    } else {
      extractedText = `[File attached: ${originalBase} (${(file.size / 1024).toFixed(1)} KB, type: ${file.type || "document"})]`
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: originalBase,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      extractedText,
    })
  } catch (error: any) {
    console.error("File upload error:", error)
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message || "Upload failed" }, { status })
  }
}
