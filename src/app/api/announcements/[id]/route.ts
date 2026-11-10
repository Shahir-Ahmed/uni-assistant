import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const ann = await prisma.announcement.findFirst({ where: { id, userId } })
    if (!ann) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title: body.title,
        subjectId: body.subjectId,
        category: body.category,
        personalRemarks: body.personalRemarks,
        isProcessed: body.isProcessed,
        extractedData: body.extractedData,
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
    await prisma.announcement.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
