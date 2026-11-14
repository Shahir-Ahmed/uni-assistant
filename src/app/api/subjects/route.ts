import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const subjects = await prisma.subject.findMany({
      where: { userId, isArchived: false },
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
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json(subjects)
  } catch (error: any) {
    console.error("GET /api/subjects error:", error)
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Subject name is required." }, { status: 400 })
    }

    const existingCount = await prisma.subject.count({ where: { userId } })

    const subject = await prisma.subject.create({
      data: {
        userId,
        name: body.name.trim().slice(0, 120),
        code: typeof body.code === "string" ? body.code.trim().slice(0, 32) : null,
        semester: typeof body.semester === "string" ? body.semester.trim().slice(0, 40) : null,
        academicYear:
          typeof body.academicYear === "string" ? body.academicYear.trim().slice(0, 20) : null,
        instructor:
          typeof body.instructor === "string" ? body.instructor.trim().slice(0, 100) : null,
        description:
          typeof body.description === "string" ? body.description.trim().slice(0, 1000) : null,
        color:
          typeof body.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(body.color)
            ? body.color
            : "#1E3A5F",
        icon: typeof body.icon === "string" ? body.icon.slice(0, 40) : null,
        sortOrder: existingCount + 1,
      },
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
    return NextResponse.json(subject, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/subjects error:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A subject with this name already exists." }, { status: 409 })
    }
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
