import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import {
  extractFromWhatsApp,
  syncWhatsAppExtractionToDb,
  ExtractionResult,
} from "@/lib/whatsapp-extractor"

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    const {
      text,
      groupName = "WhatsApp Study Group",
      sender = "WhatsApp Community",
      extraction: clientExtraction,
    } = body

    if (!text && !clientExtraction) {
      return NextResponse.json({ error: "Missing message text or extraction data" }, { status: 400 })
    }

    let extraction: ExtractionResult = clientExtraction
    if (!extraction && typeof text === "string") {
      const studentSubjects = await prisma.subject.findMany({
        where: { userId, isArchived: false },
        select: { id: true, name: true, code: true },
      })
      extraction = await extractFromWhatsApp(text, groupName, studentSubjects)
    }

    if (!extraction.isAcademic && extraction.classification === "CHIT_CHAT") {
      return NextResponse.json({
        skipped: true,
        reason: "Filtered out casual conversation/chit-chat without creating academic tasks.",
        extraction,
      })
    }

    const syncResult = await syncWhatsAppExtractionToDb(
      userId,
      extraction,
      text || extraction.description || extraction.title,
      groupName,
      sender
    )

    return NextResponse.json(syncResult)
  } catch (err: any) {
    console.error("POST /api/whatsapp/sync error:", err)
    const status = err?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json(
      { error: err.message || "Failed to sync WhatsApp academic item" },
      { status }
    )
  }
}
