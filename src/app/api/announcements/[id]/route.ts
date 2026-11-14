import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const ann = await prisma.announcement.findFirst({ where: { id, userId } })
    if (!ann) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (body.subjectId !== undefined && body.subjectId !== null) {
      const ownedSubject = await prisma.subject.findFirst({
        where: { id: String(body.subjectId), userId },
        select: { id: true },
      })
      if (!ownedSubject) {
        return NextResponse.json({ error: "Subject not found in your workspace." }, { status: 404 })
      }
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId
    if (body.category !== undefined) updateData.category = body.category
    if (body.personalRemarks !== undefined) updateData.personalRemarks = body.personalRemarks
    if (body.isProcessed !== undefined) updateData.isProcessed = body.isProcessed
    if (body.extractedData !== undefined) updateData.extractedData = body.extractedData

    const updated = await prisma.announcement.update({
      where: { id },
      data: updateData,
      include: { subject: true },
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const deleted = await prisma.announcement.deleteMany({ where: { id, userId } })
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
