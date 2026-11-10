import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const note = await prisma.studyNote.findFirst({ where: { id, userId } })
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.studyNote.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        noteType: body.noteType,
        subjectId: body.subjectId,
        version: { increment: 1 },
      },
      include: { subject: true },
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    await prisma.studyNote.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
