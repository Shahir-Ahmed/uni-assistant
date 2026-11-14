import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const note = await prisma.studyNote.findFirst({ where: { id, userId } })
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (body.subjectId !== undefined && body.subjectId !== null) {
      const ownedSubject = await prisma.subject.findFirst({
        where: { id: String(body.subjectId), userId },
        select: { id: true },
      })
      if (!ownedSubject) {
        return NextResponse.json({ error: "Subject not found in your workspace." }, { status: 404 })
      }
    }

    const updateData: any = { version: { increment: 1 } }
    if (body.title !== undefined) updateData.title = String(body.title).trim().slice(0, 200)
    if (body.content !== undefined) updateData.content = body.content
    if (body.noteType !== undefined) updateData.noteType = body.noteType
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId

    const updated = await prisma.studyNote.update({
      where: { id },
      data: updateData,
      include: { subject: true },
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const deleted = await prisma.studyNote.deleteMany({ where: { id, userId } })
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
