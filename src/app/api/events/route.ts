import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')
    const eventType = searchParams.get('eventType')

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId
    if (eventType) where.eventType = eventType

    const events = await prisma.academicEvent.findMany({
      where,
      include: { subject: true, topics: true },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(events)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const body = await req.json()

    const event = await prisma.academicEvent.create({
      data: {
        userId,
        subjectId: body.subjectId || null,
        title: body.title,
        eventType: body.eventType || 'CUSTOM',
        date: body.date ? new Date(body.date) : null,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        location: body.location || null,
        description: body.description || null,
        originalAnnouncement: body.originalAnnouncement || null,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'UPCOMING',
        ...(body.topics?.length > 0 && {
          topics: {
            create: body.topics.map((t: any) => ({
              topic: typeof t === 'string' ? t : (t.topic || String(t)),
            })),
          },
        }),
      },
      include: { subject: true, topics: true },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
