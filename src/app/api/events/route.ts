import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")
    const eventType = searchParams.get("eventType")

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId
    if (eventType) where.eventType = eventType

    const events = await prisma.academicEvent.findMany({
      where,
      include: { subject: true, topics: true },
      orderBy: { date: "asc" },
    })
    return NextResponse.json(events)
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    if (!body?.title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
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

    const event = await prisma.academicEvent.create({
      data: {
        userId,
        subjectId: validSubjectId,
        title: String(body.title).trim().slice(0, 200),
        eventType: body.eventType || "CUSTOM",
        date: body.date ? new Date(body.date) : null,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        location: body.location || null,
        description: body.description || null,
        originalAnnouncement: body.originalAnnouncement || null,
        priority: body.priority || "MEDIUM",
        status: body.status || "UPCOMING",
        ...(Array.isArray(body.topics) &&
          body.topics.length > 0 && {
            topics: {
              create: body.topics.slice(0, 20).map((t: any) => ({
                topic: typeof t === "string" ? t : t.topic || String(t),
              })),
            },
          }),
      },
      include: { subject: true, topics: true },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
