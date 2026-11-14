import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { sanitizeSafeUrl } from "@/lib/security"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId

    const resources = await prisma.resource.findMany({
      where,
      include: { subject: true, extractedTexts: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(resources)
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
      return NextResponse.json({ error: "Resource title is required." }, { status: 400 })
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

    const resource = await prisma.resource.create({
      data: {
        userId,
        subjectId: validSubjectId,
        title: String(body.title).trim().slice(0, 200),
        description: body.description || null,
        resourceType: body.resourceType || "OTHER",
        fileName: body.fileName ? String(body.fileName).slice(0, 200) : null,
        fileUrl: sanitizeSafeUrl(body.fileUrl),
        fileSize: body.fileSize ? Number(body.fileSize) : null,
        mimeType: body.mimeType || null,
        category: body.category || "OTHER",
        lectureNumber: body.lectureNumber ? Number(body.lectureNumber) : null,
        sourceDate: body.sourceDate ? new Date(body.sourceDate) : null,
        isProcessed: body.isProcessed !== undefined ? Boolean(body.isProcessed) : true,
        processingStatus: body.processingStatus || "completed",
        ...(Array.isArray(body.extractedTexts) &&
          body.extractedTexts.length > 0 && {
            extractedTexts: {
              create: body.extractedTexts.slice(0, 100).map((et: any, index: number) => ({
                slideNumber: et.slideNumber ?? index + 1,
                pageNumber: et.pageNumber ?? null,
                content: typeof et === "string" ? et : et.content || String(et),
                section: et.section || null,
              })),
            },
          }),
      },
      include: { subject: true, extractedTexts: true },
    })
    return NextResponse.json(resource, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/resources error:", error)
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
