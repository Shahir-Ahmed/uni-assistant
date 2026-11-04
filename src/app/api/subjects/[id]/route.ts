import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser()
    const subject = await prisma.subject.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            assignments: true,
            announcements: true,
            academicEvents: true,
            resources: true,
            studyNotes: true,
          },
        },
      },
    })
    if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(subject)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser()
    const body = await req.json()

    const subject = await prisma.subject.updateMany({
      where: { id, userId },
      data: {
        name: body.name,
        code: body.code,
        semester: body.semester,
        academicYear: body.academicYear,
        instructor: body.instructor,
        description: body.description,
        color: body.color,
        icon: body.icon,
        isArchived: body.isArchived,
        sortOrder: body.sortOrder,
      },
    })
    if (subject.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
            announcements: true,
            academicEvents: true,
            resources: true,
            studyNotes: true,
          },
        },
      },
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A subject with this name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser()
    await prisma.subject.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
