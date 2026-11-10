import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureGuestUser } from '@/lib/guest-user'

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')

    const where: any = { userId }
    if (subjectId) where.subjectId = subjectId

    const resources = await prisma.resource.findMany({
      where,
      include: { subject: true, extractedTexts: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(resources)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()

    const resource = await prisma.resource.create({
      data: {
        userId,
        subjectId: body.subjectId || null,
        title: body.title,
        description: body.description || null,
        resourceType: body.resourceType || 'OTHER',
        fileName: body.fileName || null,
        fileUrl: body.fileUrl || null,
        fileSize: body.fileSize ? Number(body.fileSize) : null,
        mimeType: body.mimeType || null,
        category: body.category || 'OTHER',
        lectureNumber: body.lectureNumber ? Number(body.lectureNumber) : null,
        sourceDate: body.sourceDate ? new Date(body.sourceDate) : null,
        isProcessed: body.isProcessed !== undefined ? Boolean(body.isProcessed) : true,
        processingStatus: body.processingStatus || 'completed',
        ...(Array.isArray(body.extractedTexts) && body.extractedTexts.length > 0 && {
          extractedTexts: {
            create: body.extractedTexts.map((et: any, index: number) => ({
              slideNumber: et.slideNumber ?? (index + 1),
              pageNumber: et.pageNumber ?? null,
              content: typeof et === 'string' ? et : (et.content || String(et)),
              section: et.section || null,
            })),
          },
        }),
      },
      include: { subject: true, extractedTexts: true },
    })
    return NextResponse.json(resource, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/resources error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
