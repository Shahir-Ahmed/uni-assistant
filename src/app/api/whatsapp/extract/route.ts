import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { extractFromWhatsApp } from "@/lib/whatsapp-extractor"

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    const { text, groupName = "WhatsApp Study Group", messages } = body

    const studentSubjects = await prisma.subject.findMany({
      where: { userId, isArchived: false },
      select: { id: true, name: true, code: true },
    })

    if (Array.isArray(messages) && messages.length > 0) {
      const cleanMsgs = messages
        .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
        .slice(0, 15)
      const results = await Promise.all(
        cleanMsgs.map(async (msg: string) => {
          const res = await extractFromWhatsApp(msg, groupName, studentSubjects)
          return {
            rawMessage: msg,
            extraction: res,
          }
        })
      )
      return NextResponse.json({ results })
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided for extraction" }, { status: 400 })
    }

    const extraction = await extractFromWhatsApp(text, groupName, studentSubjects)
    return NextResponse.json({ extraction })
  } catch (err: any) {
    console.error("POST /api/whatsapp/extract error:", err)
    const status = err?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json(
      { error: err.message || "Failed to extract academic data" },
      { status }
    )
  }
}
