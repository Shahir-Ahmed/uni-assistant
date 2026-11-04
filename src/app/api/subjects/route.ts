import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET() {
  try {
    const userId = await ensureGuestUser()
    const subjects = await prisma.subject.findMany({
      where: { userId, isArchived: false },
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
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(subjects)
  } catch (error: any) {
    console.error('GET /api/subjects error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const body = await req.json()

    const existingCount = await prisma.subject.count({ where: { userId } })

    const subject = await prisma.subject.create({
      data: {
        userId,
        name: body.name,
        code: body.code || null,
        semester: body.semester || null,
        academicYear: body.academicYear || null,
        instructor: body.instructor || null,
        description: body.description || null,
        color: body.color || '#1E3A5F',
        icon: body.icon || null,
        sortOrder: existingCount + 1,
      },
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
    return NextResponse.json(subject, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/subjects error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A subject with this name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
