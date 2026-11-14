import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { sanitizeSafeUrl } from "@/lib/security"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")
    const status = searchParams.get("status")

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId
    if (status) where.status = status

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        subject: true,
        history: { orderBy: { changedAt: "desc" } },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    })
    return NextResponse.json(assignments)
  } catch (error: any) {
    console.error("GET /api/assignments error:", error)
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    if (!body?.subjectId || !body?.title) {
      return NextResponse.json({ error: "subjectId and title are required." }, { status: 400 })
    }

    // Ownership check to prevent cross-tenant subjectId IDOR
    const ownedSubject = await prisma.subject.findFirst({
      where: { id: String(body.subjectId), userId },
      select: { id: true },
    })
    if (!ownedSubject) {
      return NextResponse.json({ error: "Subject not found in your workspace." }, { status: 404 })
    }

    const assignment = await prisma.assignment.create({
      data: {
        userId,
        subjectId: ownedSubject.id,
        title: String(body.title).trim().slice(0, 200),
        description: body.description || null,
        instructions: body.instructions || null,
        originalAnnouncement: body.originalAnnouncement || null,
        assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        deadlineConfirmed: Boolean(body.deadlineConfirmed),
        submissionMethod: body.submissionMethod || null,
        submissionLink: sanitizeSafeUrl(body.submissionLink),
        priority: body.priority || "MEDIUM",
        estimatedEffort: body.estimatedEffort || null,
        status: body.status || "NOT_STARTED",
        personalNotes: body.personalNotes || null,
      },
      include: { subject: true, history: true },
    })
    return NextResponse.json(assignment, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/assignments error:", error)
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
