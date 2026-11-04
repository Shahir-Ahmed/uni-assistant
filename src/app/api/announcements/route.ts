import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId

    const announcements = await prisma.announcement.findMany({
      where,
      include: { subject: true },
      orderBy: { dateReceived: 'desc' },
    })
    return NextResponse.json(announcements)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser()
    const body = await req.json()

    const announcement = await prisma.announcement.create({
      data: {
        userId,
        subjectId: body.subjectId || null,
        title: body.title || null,
        originalMessage: body.originalMessage,
        category: body.category || 'GENERAL',
        source: body.source || null,
        sourceGroup: body.sourceGroup || null,
        dateReceived: body.dateReceived ? new Date(body.dateReceived) : new Date(),
        extractedData: body.extractedData || null,
        personalRemarks: body.personalRemarks || null,
        isProcessed: body.isProcessed || false,
      },
      include: { subject: true },
    })
    return NextResponse.json(announcement, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
