import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { DEFAULT_WHATSAPP_CONFIG, WhatsAppSyncConfig } from "@/lib/whatsapp-extractor"

export async function GET(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)

    const pref = await prisma.preference.findUnique({
      where: {
        userId_key: {
          userId,
          key: "whatsapp_config",
        },
      },
    })

    if (!pref) {
      return NextResponse.json({
        config: DEFAULT_WHATSAPP_CONFIG,
      })
    }

    return NextResponse.json({
      config: pref.value as unknown as WhatsAppSyncConfig,
    })
  } catch (err: any) {
    console.error("GET /api/whatsapp/config error:", err)
    return NextResponse.json({ config: DEFAULT_WHATSAPP_CONFIG }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    const { config } = body

    if (!config) {
      return NextResponse.json({ error: "Missing config" }, { status: 400 })
    }

    const updatedPref = await prisma.preference.upsert({
      where: {
        userId_key: {
          userId,
          key: "whatsapp_config",
        },
      },
      update: {
        value: config,
      },
      create: {
        userId,
        key: "whatsapp_config",
        value: config,
      },
    })

    return NextResponse.json({
      success: true,
      config: updatedPref.value,
    })
  } catch (err: any) {
    console.error("POST /api/whatsapp/config error:", err)
    return NextResponse.json({ error: err.message || "Failed to update configuration" }, { status: 500 })
  }
}
