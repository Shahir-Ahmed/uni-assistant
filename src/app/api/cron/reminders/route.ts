import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth"
import { timingSafeEqualString } from "@/lib/security"

/**
 * Cron / Reminder Dispatcher
 * Protected: requires valid CRON_SECRET Bearer token OR an authenticated student session (scoped to their own reminders).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
    const cronSecret = process.env.CRON_SECRET || ""

    const isCronAuthorized = Boolean(
      cronSecret && bearer && timingSafeEqualString(bearer, cronSecret)
    )
    const authUser = isCronAuthorized ? null : await getAuthenticatedUser(req)

    if (!isCronAuthorized && !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const dueReminders = await prisma.reminder.findMany({
      where: {
        ...(authUser ? { userId: authUser.id } : {}),
        status: "PENDING",
        remindAt: { lte: now },
      },
      take: 50,
    })

    if (dueReminders.length > 0) {
      await prisma.reminder.updateMany({
        where: { id: { in: dueReminders.map((r) => r.id) } },
        data: { status: "SENT", isSent: true, sentAt: now },
      })
    }

    return NextResponse.json({
      status: "success",
      processedAt: now.toISOString(),
      message: "Reminder check completed securely.",
      dispatchedCount: dueReminders.length,
    })
  } catch (error: any) {
    console.error("GET /api/cron/reminders error:", error)
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 })
  }
}
