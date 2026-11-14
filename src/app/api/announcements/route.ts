import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId

    const announcements = await prisma.announcement.findMany({
      where,
      include: { subject: true },
      orderBy: { dateReceived: "desc" },
    })
    return NextResponse.json(announcements)
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    if (!body?.originalMessage) {
      return NextResponse.json({ error: "Announcement message is required." }, { status: 400 })
    }

    let validSubjectId: string | null = null
    if (body.subjectId) {
      const ownedSubject = await prisma.subject.findFirst({
        where: { id: String(body.subjectId), userId },
        select: { id: true },
      })
      if (!ownedSubject) {
        return NextResponse.json({ error: "Subject not found in your workspace." }, { status: 404 })
      }
      validSubjectId = ownedSubject.id
    }

    const announcement = await prisma.announcement.create({
      data: {
        userId,
        subjectId: validSubjectId,
        title: body.title ? String(body.title).slice(0, 200) : null,
        originalMessage: String(body.originalMessage),
        category: body.category || "GENERAL",
        source: body.source || null,
        sourceGroup: body.sourceGroup || null,
        dateReceived: body.dateReceived ? new Date(body.dateReceived) : new Date(),
        extractedData: body.extractedData || null,
        personalRemarks: body.personalRemarks || null,
        isProcessed: Boolean(body.isProcessed),
      },
      include: { subject: true },
    })
    return NextResponse.json(announcement, { status: 201 })
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
