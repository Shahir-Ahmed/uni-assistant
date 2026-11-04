import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser()
    await prisma.resource.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
