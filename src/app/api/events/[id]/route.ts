import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const event = await prisma.academicEvent.findFirst({ where: { id, userId } })
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.eventType !== undefined) updateData.eventType = body.eventType
    if (body.date !== undefined) updateData.date = body.date ? new Date(body.date) : null
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.location !== undefined) updateData.location = body.location
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.status !== undefined) updateData.status = body.status
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId

    const updated = await prisma.academicEvent.update({
      where: { id },
      data: updateData,
      include: { subject: true, topics: true },
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
    await prisma.academicEvent.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
