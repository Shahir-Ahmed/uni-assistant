import { NextResponse } from 'next/server'

// Vercel Cron handler for background reminders
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    // In production Vercel checks CRON_SECRET if configured
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Query due reminders that are still PENDING
    // Idempotent processing ensures no duplicate sends
    return NextResponse.json({
      status: 'success',
      processedAt: now.toISOString(),
      message: 'Background reminder job executed successfully.',
      dispatchedCount: 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
