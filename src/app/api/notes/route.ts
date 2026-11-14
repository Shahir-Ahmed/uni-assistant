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

    const notes = await prisma.studyNote.findMany({
      where,
      include: { subject: true },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json(notes)
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    if (!body?.title || !body?.content) {
      return NextResponse.json({ error: "Note title and content are required." }, { status: 400 })
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

    const note = await prisma.studyNote.create({
      data: {
        userId,
        subjectId: validSubjectId,
        title: String(body.title).trim().slice(0, 200),
        content: String(body.content),
        noteType: body.noteType || "DETAILED",
        isGenerated: Boolean(body.isGenerated),
      },
      include: { subject: true },
    })
    return NextResponse.json(note, { status: 201 })
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
