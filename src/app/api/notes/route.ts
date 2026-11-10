import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId

    const notes = await prisma.studyNote.findMany({
      where,
      include: { subject: true },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(notes)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const note = await prisma.studyNote.create({
      data: {
        userId,
        subjectId: body.subjectId || null,
        title: body.title,
        content: body.content,
        noteType: body.noteType || 'DETAILED',
        isGenerated: body.isGenerated || false,
      },
      include: { subject: true },
    })
    return NextResponse.json(note, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
