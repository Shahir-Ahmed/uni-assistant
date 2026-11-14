import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  hashPassword,
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth"
import { WhatsAppSyncConfig } from "@/lib/whatsapp-extractor"
import { promoteOnboardingWhatsAppSession } from "@/lib/whatsapp-manager"
import { checkRateLimit, generateSecureToken, getClientIp } from "@/lib/security"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rate = checkRateLimit(`register:${ip}`, 8, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please retry in ${rate.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    const body = await req.json()
    const {
      name,
      email,
      password,
      semester = "Fall 2026",
      major = "Computer Science",
      whatsappPermissionGranted,
      whatsappPhone = "",
      whatsappPaired = false,
      onboardingSessionId = "",
      autoSyncAssignments = true,
      autoSyncQuizzes = true,
      autoSyncNotes = true,
      filterChitChat = true,
    } = body

    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: "Please provide a valid full name (2-80 characters)." }, { status: 400 })
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid student email address." }, { status: 400 })
    }

    if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 6 and 128 characters long." },
        { status: 400 }
      )
    }

    if (whatsappPermissionGranted !== true) {
      return NextResponse.json(
        { error: "WhatsApp integration permission is required to initialize your private workspace." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        timezone: "Asia/Karachi",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    // Initialize student's private WhatsApp config with high-entropy CSPRNG webhook secret
    const trimmedPhone = typeof whatsappPhone === "string" ? whatsappPhone.trim().slice(0, 32) : ""
    const isConnected = Boolean(whatsappPaired && trimmedPhone.length > 0)
    const userVerifyToken = generateSecureToken("scholaros_wa", 16)

    const whatsappConfig: WhatsAppSyncConfig = {
      status: isConnected ? "CONNECTED" : "DISCONNECTED",
      permissionGranted: true,
      permissionGrantedAt: new Date().toISOString(),
      permissionScope: [
        "read_university_communities",
        "read_study_groups",
        "extract_quizzes_assignments",
        "extract_lecture_notes",
        "filter_non_academic_chat",
      ],
      pairedPhone: trimmedPhone,
      pairedAt: isConnected ? new Date().toISOString() : undefined,
      autoSyncAssignments: Boolean(autoSyncAssignments),
      autoSyncQuizzes: Boolean(autoSyncQuizzes),
      autoSyncNotes: Boolean(autoSyncNotes),
      filterChitChat: Boolean(filterChitChat),
      webhookVerifyToken: userVerifyToken,
      groups: [],
    }

    await prisma.preference.create({
      data: {
        userId: user.id,
        key: "whatsapp_config",
        value: whatsappConfig as any,
      },
    })

    // Promote live Baileys WhatsApp session if user paired during onboarding
    if (
      onboardingSessionId &&
      typeof onboardingSessionId === "string" &&
      /^[a-zA-Z0-9_-]{8,64}$/.test(onboardingSessionId)
    ) {
      try {
        await promoteOnboardingWhatsAppSession(`onboard-${onboardingSessionId}`, user.id)
      } catch (promoErr) {
        console.warn("Could not promote onboarding WhatsApp session:", promoErr)
      }
    }

    const safeSemester = typeof semester === "string" ? semester.trim().slice(0, 40) : "Fall 2026"
    const safeMajor = typeof major === "string" ? major.trim().slice(0, 60) : "Computer Science"

    await prisma.preference.create({
      data: {
        userId: user.id,
        key: "student_profile",
        value: {
          semester: safeSemester,
          major: safeMajor,
          createdAt: new Date().toISOString(),
        },
      },
    })

    // Seed isolated starter courses
    try {
      const subjects = [
        {
          name: "Data Structures & Algorithms",
          code: "CS-201",
          instructor: "Faculty Coordinator",
          description: "Core algorithms, trees, graphs, sorting, and computational complexity.",
          color: "#1E3A5F",
          icon: "Layers",
        },
        {
          name: "Database Systems",
          code: "CS-301",
          instructor: "Department Head",
          description: "Relational database modeling, SQL, functional dependencies, and transactions.",
          color: "#3B82F6",
          icon: "Database",
        },
        {
          name: "Operating Systems",
          code: "CS-302",
          instructor: "Lab Instructor",
          description: "Process management, CPU scheduling, concurrency, virtual memory, and I/O systems.",
          color: "#0D9488",
          icon: "Cpu",
        },
      ]

      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i]
        const createdSubject = await prisma.subject.create({
          data: {
            userId: user.id,
            name: s.name,
            code: s.code,
            semester: safeSemester,
            academicYear: "2026-2027",
            instructor: s.instructor,
            description: s.description,
            color: s.color,
            icon: s.icon,
            sortOrder: i + 1,
          },
        })

        if (i === 0) {
          await prisma.assignment.create({
            data: {
              userId: user.id,
              subjectId: createdSubject.id,
              title: "Assignment 1: Algorithm Complexity & Analysis",
              description:
                "Analyze Big-O time and space complexity for recursive algorithms and submit proof report.",
              priority: "HIGH",
              status: "NOT_STARTED",
              deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
              submissionMethod: "University Portal",
            },
          })
        }
      }

      await prisma.announcement.create({
        data: {
          userId: user.id,
          title: `Welcome to your Private ScholarOS Space, ${user.name}!`,
          originalMessage: `Your isolated university workspace (${safeMajor} - ${safeSemester}) and WhatsApp integration permissions are active. University community notices, quizzes, assignments, and study notes remain encrypted and private to your account.`,
          category: "GENERAL",
          source: "ScholarOS System",
          isProcessed: true,
        },
      })
    } catch (seedErr) {
      console.warn("Could not seed starter environment for new student:", seedErr)
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email!,
      name: user.name || "Student",
    })

    const response = NextResponse.json(
      {
        user,
        token,
        whatsappConfig,
        message: "Private student account created with WhatsApp permission.",
      },
      { status: 201 }
    )

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...getSessionCookieOptions(req, 30 * 24 * 60 * 60),
    })

    return response
  } catch (error: any) {
    console.error("POST /api/auth/register error:", error)
    return NextResponse.json(
      { error: "Failed to create student account." },
      { status: 500 }
    )
  }
}
