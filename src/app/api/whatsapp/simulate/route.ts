import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { extractFromWhatsApp, syncWhatsAppExtractionToDb, SIMULATION_SCENARIOS } from "@/lib/whatsapp-extractor"

export async function GET() {
  return NextResponse.json({
    scenarios: SIMULATION_SCENARIOS,
  })
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    const { scenarioId, autoCommit = true } = body

    const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId) || SIMULATION_SCENARIOS[0]

    const studentSubjects = await prisma.subject.findMany({
      where: { userId, isArchived: false },
      select: { id: true, name: true, code: true },
    })

    const extraction = await extractFromWhatsApp(scenario.text, scenario.groupName, studentSubjects)

    let syncResult = null
    if (autoCommit && extraction.isAcademic && extraction.classification !== "CHIT_CHAT") {
      syncResult = await syncWhatsAppExtractionToDb(
        userId,
        extraction,
        scenario.text,
        scenario.groupName,
        scenario.sender
      )
    }

    return NextResponse.json({
      success: true,
      scenario,
      extraction,
      synced: !!syncResult,
      syncResult,
    })
  } catch (err: any) {
    console.error("POST /api/whatsapp/simulate error:", err)
    return NextResponse.json({ error: err.message || "Simulation failed" }, { status: 500 })
  }
}
