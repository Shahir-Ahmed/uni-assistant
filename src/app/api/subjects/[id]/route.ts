import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const subject = await prisma.subject.findFirst({
      where: { id, userId },
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
    if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(subject)
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (typeof body.name === "string") updateData.name = body.name.trim().slice(0, 120)
    if (body.code !== undefined)
      updateData.code = typeof body.code === "string" ? body.code.trim().slice(0, 32) : null
    if (body.semester !== undefined) updateData.semester = body.semester
    if (body.academicYear !== undefined) updateData.academicYear = body.academicYear
    if (body.instructor !== undefined) updateData.instructor = body.instructor
    if (body.description !== undefined) updateData.description = body.description
    if (typeof body.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(body.color)) {
      updateData.color = body.color
    }
    if (body.icon !== undefined) updateData.icon = body.icon
    if (typeof body.isArchived === "boolean") updateData.isArchived = body.isArchived
    if (Number.isFinite(Number(body.sortOrder))) updateData.sortOrder = Number(body.sortOrder)

    const subject = await prisma.subject.updateMany({
      where: { id, userId },
      data: updateData,
    })
    if (subject.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.subject.findFirst({
      where: { id, userId },
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
    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A subject with this name already exists." }, { status: 409 })
    }
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await ensureGuestUser(req)
    const deleted = await prisma.subject.deleteMany({ where: { id, userId } })
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
