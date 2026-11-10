import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const assignment = await prisma.assignment.findFirst({
      where: { id, userId },
      include: { subject: true, history: { orderBy: { changedAt: 'desc' } } },
    })
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(assignment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    // Get the current assignment to compute history
    const current = await prisma.assignment.findFirst({ where: { id, userId } })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Track changed fields for history
    const historyEntries: { field: string; oldValue?: string; newValue?: string; reason?: string }[] = []
    if (body.deadline !== undefined && String(current.deadline) !== String(body.deadline)) {
      historyEntries.push({
        field: 'DEADLINE',
        oldValue: current.deadline?.toISOString() || 'none',
        newValue: body.deadline ? new Date(body.deadline).toISOString() : 'removed',
        reason: body._changeReason || 'Updated',
      })
    }
    if (body.status !== undefined && current.status !== body.status) {
      historyEntries.push({
        field: 'STATUS',
        oldValue: current.status,
        newValue: body.status,
        reason: body._changeReason || 'Updated',
      })
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.instructions !== undefined) updateData.instructions = body.instructions
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null
    if (body.deadlineConfirmed !== undefined) updateData.deadlineConfirmed = body.deadlineConfirmed
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.submissionMethod !== undefined) updateData.submissionMethod = body.submissionMethod
    if (body.submissionLink !== undefined) updateData.submissionLink = body.submissionLink
    if (body.estimatedEffort !== undefined) updateData.estimatedEffort = body.estimatedEffort
    if (body.personalNotes !== undefined) updateData.personalNotes = body.personalNotes
    if (body.grade !== undefined) updateData.grade = body.grade
    if (body.feedback !== undefined) updateData.feedback = body.feedback
    if (body.completionDate !== undefined) updateData.completionDate = body.completionDate ? new Date(body.completionDate) : null

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        ...updateData,
        ...(historyEntries.length > 0 && {
          history: {
            create: historyEntries,
          },
        }),
      },
      include: { subject: true, history: { orderBy: { changedAt: 'desc' } } },
    })
    return NextResponse.json(assignment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    await prisma.assignment.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
