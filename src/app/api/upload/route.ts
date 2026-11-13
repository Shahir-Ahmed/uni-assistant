import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { ensureGuestUser } from '@/lib/guest-user'

export async function POST(req: NextRequest) {
  try {
    await ensureGuestUser(req)
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const safeBaseName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${Date.now()}-${safeBaseName}`
    const filePath = path.join(uploadsDir, fileName)

    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/${fileName}`

    // Attempt to extract text if it's text-based or code
    let extractedText = ''
    const isTextFile =
      file.type.startsWith('text/') ||
      /\.(txt|md|markdown|json|csv|tsv|py|js|ts|tsx|jsx|html|css|sql|sh|env)$/i.test(file.name)

    if (isTextFile) {
      extractedText = buffer.toString('utf-8')
    } else {
      // For binary files (PDFs, PPT, Images), provide structured description for AI
      extractedText = `[File attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB, type: ${file.type || 'document'})]`
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      extractedText,
    })
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}

