import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')
    const status = searchParams.get('status')

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId
    if (status) where.status = status

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        subject: true,
        history: { orderBy: { changedAt: 'desc' } },
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(assignments)
  } catch (error: any) {
    console.error('GET /api/assignments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const body = await req.json()

    const assignment = await prisma.assignment.create({
      data: {
        userId,
        subjectId: body.subjectId,
        title: body.title,
        description: body.description || null,
        instructions: body.instructions || null,
        originalAnnouncement: body.originalAnnouncement || null,
        assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        deadlineConfirmed: body.deadlineConfirmed || false,
        submissionMethod: body.submissionMethod || null,
        submissionLink: body.submissionLink || null,
        priority: body.priority || 'MEDIUM',
        estimatedEffort: body.estimatedEffort || null,
        status: body.status || 'NOT_STARTED',
        personalNotes: body.personalNotes || null,
      },
      include: { subject: true, history: true },
    })
    return NextResponse.json(assignment, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/assignments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
