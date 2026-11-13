import { prisma } from "@/lib/db"
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini"

export interface WhatsAppMessage {
  id: string
  sender: string
  senderPhone?: string
  groupName: string
  groupId?: string
  text: string
  timestamp: string | Date
  hasMedia?: boolean
  mediaType?: "document" | "image" | "audio"
  mediaUrl?: string
}

export type AcademicClassification =
  | "ASSIGNMENT"
  | "QUIZ"
  | "EXAM"
  | "NOTE"
  | "SCHEDULE_CHANGE"
  | "ANNOUNCEMENT"
  | "CHIT_CHAT"

export interface ExtractionResult {
  classification: AcademicClassification
  isAcademic: boolean
  confidence: number
  title: string
  subjectCode?: string
  subjectName?: string
  subjectId?: string
  description?: string
  deadline?: string | null // ISO string
  deadlineFormatted?: string
  eventDate?: string | null // ISO string
  eventDateFormatted?: string
  eventType?: "QUIZ" | "MIDTERM" | "FINAL_EXAM" | "VIVA" | "PRESENTATION" | "CLASS" | "ASSIGNMENT_DEADLINE"
  location?: string
  topics?: string[]
  noteContent?: string // Markdown formatted study note
  noteType?: "FORMULA_SHEET" | "SUMMARY" | "EXAM_FOCUSED" | "DEFINITIONS" | "DETAILED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  submissionMethod?: string
  reasoning: string
}

export interface WhatsAppGroupConfig {
  id: string
  name: string
  subjectCode?: string
  subjectId?: string
  autoSync: boolean
  messageCount: number
  lastActive: string
  color: string
}

export interface WhatsAppSyncConfig {
  status: "CONNECTED" | "DISCONNECTED" | "PAIRING"
  permissionGranted?: boolean
  permissionGrantedAt?: string
  permissionScope?: string[]
  pairedPhone: string
  pairedAt?: string
  autoSyncAssignments: boolean
  autoSyncQuizzes: boolean
  autoSyncNotes: boolean
  filterChitChat: boolean
  webhookVerifyToken: string
  groups: WhatsAppGroupConfig[]
}

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppSyncConfig = {
  status: "DISCONNECTED",
  permissionGranted: false,
  pairedPhone: "",
  autoSyncAssignments: true,
  autoSyncQuizzes: true,
  autoSyncNotes: true,
  filterChitChat: true,
  webhookVerifyToken: "scholaros_wa_sec_token_2026",
  groups: [
    {
      id: "grp-cs301",
      name: "CS-301 Operating Systems (CR Group)",
      subjectCode: "CS-301",
      autoSync: true,
      messageCount: 0,
      lastActive: "Ready to sync",
      color: "#2563EB",
    },
    {
      id: "grp-cs201",
      name: "Algorithms & Data Structures Study Circle",
      subjectCode: "CS-201",
      autoSync: true,
      messageCount: 0,
      lastActive: "Ready to sync",
      color: "#059669",
    },
    {
      id: "grp-cs302",
      name: "Database Systems Lab & Theory Q&A",
      subjectCode: "CS-302",
      autoSync: true,
      messageCount: 0,
      lastActive: "Ready to sync",
      color: "#D97706",
    },
    {
      id: "grp-batch26",
      name: "Class of 2026 Official Batch Broadcast",
      subjectCode: "ALL",
      autoSync: true,
      messageCount: 0,
      lastActive: "Ready to sync",
      color: "#7C3AED",
    },
  ],
}

export const SIMULATION_SCENARIOS = [
  {
    id: "quiz-os",
    groupName: "CS-301 Operating Systems (CR Group)",
    sender: "Sarah Jenkins (Class Representative)",
    text: "📢 Attention Class! Dr. Aris has announced Quiz 2 for CS-301 Operating Systems on Thursday Nov 19 at 10:15 AM in Lab 3. Topics covered: Dynamic Memory Allocation, Page Tables, and Virtual Memory. Total 20 marks. No calculators allowed.",
    expectedType: "QUIZ",
    badgeLabel: "Surprise Quiz Announcement",
  },
  {
    id: "assignment-os",
    groupName: "CS-301 Operating Systems (CR Group)",
    sender: "David Miller (Teaching Assistant)",
    text: "Assignment 3: Multi-Threaded CPU Scheduler is now live on the course portal! You must implement Round Robin and Priority scheduling in C with POSIX threads. Deadline: Friday, Nov 27 at 11:59 PM. Submit your tar.gz repository on Google Classroom.",
    expectedType: "ASSIGNMENT",
    badgeLabel: "Coursework Deadline",
  },
  {
    id: "notes-db",
    groupName: "Database Systems Lab & Theory Q&A",
    sender: "Prof. Elena Vance",
    text: "Important Midterm Revision Notes: Review BCNF vs 3NF decomposition steps. Remember: A relation R is in BCNF if for every non-trivial FD X -> Y, X is a superkey. For ACID properties: Atomicity (WAL logging), Consistency (Invariants), Isolation (2PL Locking), Durability (Checkpoints).",
    expectedType: "NOTE",
    badgeLabel: "Instructor Cheatsheet & Formulas",
  },
  {
    id: "exam-algo",
    groupName: "Algorithms & Data Structures Study Circle",
    sender: "Academic Department",
    text: "NOTICE: CS-201 Midterm Examination date confirmed for Wednesday, Dec 02 at 09:00 AM in Examination Hall B. Duration: 2 hours. Covers Asymptotic Analysis, Divide & Conquer, Dynamic Programming, and Graph Traversals (Dijkstra, BFS/DFS).",
    expectedType: "EXAM",
    badgeLabel: "Midterm Exam Timetable",
  },
  {
    id: "schedule-change",
    groupName: "Class of 2026 Official Batch Broadcast",
    sender: "Department Coordinator",
    text: "Attention students: Tomorrow's 8:30 AM Linear Algebra lecture in Hall 101 is rescheduled to 02:00 PM in Room 204 due to faculty seminar.",
    expectedType: "SCHEDULE_CHANGE",
    badgeLabel: "Lecture Rescheduled",
  },
  {
    id: "chit-chat-spam",
    groupName: "Algorithms & Data Structures Study Circle",
    sender: "Mark",
    text: "Hey guys anyone know what room we have next? haha also thanks for the lecture slides yesterday lol 👍",
    expectedType: "CHIT_CHAT",
    badgeLabel: "Casual Chit-Chat (Ignored)",
  },
]

/**
 * Intelligently extract academic items from a WhatsApp message or transcript using Gemini API
 * with automatic fallback to deterministic rule-based NLP.
 */
export async function extractFromWhatsApp(
  messageText: string,
  groupName: string = "WhatsApp Study Group",
  existingSubjects: { id: string; name: string; code?: string | null }[] = []
): Promise<ExtractionResult> {
  const trimmed = messageText.trim()
  if (!trimmed) {
    return {
      classification: "CHIT_CHAT",
      isAcademic: false,
      confidence: 1,
      title: "Empty Message",
      priority: "LOW",
      reasoning: "Message contained no text content.",
    }
  }

  // Attempt extraction via Gemini 3.8 / 2.5 Flash
  const gemini = getGeminiClient()
  if (gemini) {
    try {
      const subjectsContext = existingSubjects.length > 0
        ? existingSubjects.map((s) => `${s.name} (Code: ${s.code || "N/A"}, ID: ${s.id})`).join("\n")
        : "CS-301 Operating Systems, CS-201 Data Structures & Algorithms, CS-302 Database Systems"

      const prompt = `You are ScholarOS WhatsApp Academic Intelligence Extractor.
A student received the following message in a WhatsApp university/study group ("${groupName}").

Current date context: November 2026.
Student enrolled subjects:
${subjectsContext}

WhatsApp Message:
"""
${trimmed}
"""

TASK:
Analyze the message and extract any academic item:
1. Determine if this message is academic (assignment, quiz, exam, study notes, timetable change) or casual chit-chat/spam (e.g. "thanks", "lol", "attendance link", "good morning", "anyone free?").
2. Classify into:
   - "ASSIGNMENT": Homework, programming task, problem set, project milestone, lab report.
   - "QUIZ": Quiz, surprise test, viva, class evaluation.
   - "EXAM": Midterm, final exam, practical exam.
   - "NOTE": Helpful study notes, formula cheatsheet, revision summary, key concepts shared by CR/peers/instructor.
   - "SCHEDULE_CHANGE": Class cancellation, rescheduled lecture or lab, room change.
   - "ANNOUNCEMENT": General teacher/CR notice with no deadline.
   - "CHIT_CHAT": Casual conversation, banter, memes, stickers, irrelevant chatter.
3. Extract:
   - title: Clear, concise academic title (e.g. "Assignment 3: Virtual Memory & Page Replacement" or "Quiz 2: Graph Algorithms").
   - subjectCode or subjectName: Closest matching course from student subjects or extracted course name.
   - subjectId: Exact ID from student enrolled subjects list above if matched, or null.
   - description: Detailed requirements, guidelines, rules, or questions asked.
   - deadline: Exact ISO 8601 string (e.g. "2026-11-20T23:59:00Z") if a deadline exists, otherwise null. Convert relative dates ("next Friday", "tomorrow at 5pm", "by Nov 25th 11:59pm") to realistic ISO dates in Nov/Dec 2026.
   - eventDate: Exact ISO 8601 string for quizzes, exams, or meetings.
   - eventType: "QUIZ" | "MIDTERM" | "FINAL_EXAM" | "VIVA" | "PRESENTATION" | "CLASS" (if applicable).
   - location: Hall, Room number, or Zoom/Meet URL.
   - topics: Array of string syllabus/revision topics.
   - noteContent: If classified as NOTE, produce a clean markdown study guide/formula sheet from the message.
   - noteType: "FORMULA_SHEET" | "SUMMARY" | "EXAM_FOCUSED" | "DEFINITIONS" | "DETAILED".
   - priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT".
   - submissionMethod: E.g., "Google Classroom", "Canvas", "Email to instructor", "GitHub repo", "Hard copy in class".
   - confidence: Number between 0.0 and 1.0.
   - reasoning: 1 concise sentence explaining the extraction decision.

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "classification": "ASSIGNMENT",
  "isAcademic": true,
  "confidence": 0.95,
  "title": "...",
  "subjectCode": "...",
  "subjectName": "...",
  "subjectId": null,
  "description": "...",
  "deadline": null,
  "eventDate": null,
  "eventType": null,
  "location": null,
  "topics": [],
  "noteContent": null,
  "noteType": null,
  "priority": "MEDIUM",
  "submissionMethod": null,
  "reasoning": "..."
}`

      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      })

      const rawText = response.text || ""
      const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim()
      const parsed = JSON.parse(cleanJson) as ExtractionResult

      // Ensure subjectId is resolved if subjectCode matches
      if (!parsed.subjectId && parsed.subjectCode) {
        const found = existingSubjects.find(
          (s) => s.code?.toLowerCase() === parsed.subjectCode?.toLowerCase() ||
                 s.name.toLowerCase().includes(parsed.subjectCode?.toLowerCase() || "")
        )
        if (found) {
          parsed.subjectId = found.id
          parsed.subjectName = found.name
        }
      }

      return parsed
    } catch (err) {
      console.warn("Gemini WhatsApp extraction error, using deterministic fallback:", err)
    }
  }

  // Deterministic rule-based fallback
  return fallbackRuleExtractor(trimmed, groupName, existingSubjects)
}

/**
 * Resilient rule-based academic NLP extractor for zero-latency or offline fallback
 */
function fallbackRuleExtractor(
  text: string,
  groupName: string,
  subjects: { id: string; name: string; code?: string | null }[]
): ExtractionResult {
  const lower = text.toLowerCase()

  // 1. Chit-chat filter
  const isChitchat =
    /^(ok|okay|k|thanks|thank you|thx|thnx|yes|no|nope|lol|lmao|haha|nice|plz|bro|guys|anyone|done|great|👍|🙏|😂)\b/i.test(
      lower
    ) && text.length < 50

  if (isChitchat && !lower.includes("quiz") && !lower.includes("assignment") && !lower.includes("exam")) {
    return {
      classification: "CHIT_CHAT",
      isAcademic: false,
      confidence: 0.92,
      title: "Group Chat Message",
      priority: "LOW",
      reasoning: "Casual chat or acknowledgment with no actionable academic task.",
    }
  }

  // 2. Identify Course / Subject
  let matchedSubject = subjects.find((s) => {
    if (s.code && lower.includes(s.code.toLowerCase())) return true
    if (s.name && lower.includes(s.name.toLowerCase())) return true
    return false
  })

  // Try matching via group name if not found in text
  if (!matchedSubject) {
    matchedSubject = subjects.find((s) => {
      if (s.code && groupName.toLowerCase().includes(s.code.toLowerCase())) return true
      if (s.name && groupName.toLowerCase().includes(s.name.toLowerCase())) return true
      return false
    })
  }

  const subjectCode = matchedSubject?.code || (lower.includes("os") ? "CS-301" : lower.includes("algo") ? "CS-201" : lower.includes("db") ? "CS-302" : "GENERAL")
  const subjectName = matchedSubject?.name || (subjectCode === "CS-301" ? "Operating Systems" : subjectCode === "CS-201" ? "Data Structures & Algorithms" : "Computer Science")

  // 3. Extract dates & deadlines
  let extractedDate: Date | null = null
  const now = new Date()

  if (lower.includes("tomorrow")) {
    extractedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    extractedDate.setHours(23, 59, 0, 0)
  } else if (lower.includes("next friday") || lower.includes("friday")) {
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    extractedDate = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000)
    extractedDate.setHours(23, 59, 0, 0)
  } else if (lower.includes("next monday") || lower.includes("monday")) {
    const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7
    extractedDate = new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000)
    extractedDate.setHours(23, 59, 0, 0)
  } else {
    // Regex for date like "Nov 20", "20th Nov", "20/11", "2026-11-20"
    const dateMatch = text.match(/(?:due|deadline|date|on|by)[:\s]+([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i)
    if (dateMatch) {
      extractedDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  }

  // 4. Classify Type
  const isQuiz = /quiz|viva|test|evaluation|assessment/i.test(lower)
  const isExam = /midterm|final\s*exam|practical\s*exam|semester\s*exam/i.test(lower)
  const isAssignment = /assignment|homework|problem\s*set|project\s*submission|lab\s*report/i.test(lower)
  const isNote = /formula|notes|cheatsheet|summary|revision|slides\s*summary|key\s*points/i.test(lower)
  const isScheduleChange = /cancelled|rescheduled|class\s*postponed|timing\s*change|room\s*change/i.test(lower)

  if (isQuiz) {
    const topicsMatch = text.match(/(?:topics?|syllabus|chapters?)[:\s]+([^\n.]+)/i)
    const topics = topicsMatch
      ? topicsMatch[1].split(/,|and/).map((t) => t.trim()).filter(Boolean)
      : ["Course Material"]

    return {
      classification: "QUIZ",
      isAcademic: true,
      confidence: 0.88,
      title: `Quiz: ${subjectCode} Assessment`,
      subjectCode,
      subjectName,
      subjectId: matchedSubject?.id,
      description: text,
      eventDate: extractedDate ? extractedDate.toISOString() : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      eventType: "QUIZ",
      location: lower.includes("lab") ? "Lab Room" : "Main Classroom",
      topics,
      priority: "HIGH",
      reasoning: "Detected quiz announcement with assessment details.",
    }
  }

  if (isExam) {
    return {
      classification: "EXAM",
      isAcademic: true,
      confidence: 0.94,
      title: `${subjectCode} Examination`,
      subjectCode,
      subjectName,
      subjectId: matchedSubject?.id,
      description: text,
      eventDate: extractedDate ? extractedDate.toISOString() : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      eventType: lower.includes("midterm") ? "MIDTERM" : "FINAL_EXAM",
      location: "University Examination Hall",
      topics: ["Comprehensive Syllabus"],
      priority: "URGENT",
      reasoning: "Major examination notice extracted from group message.",
    }
  }

  if (isAssignment) {
    return {
      classification: "ASSIGNMENT",
      isAcademic: true,
      confidence: 0.91,
      title: `${subjectCode} Assignment`,
      subjectCode,
      subjectName,
      subjectId: matchedSubject?.id,
      description: text,
      deadline: extractedDate ? extractedDate.toISOString() : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: lower.includes("urgent") || lower.includes("tomorrow") ? "URGENT" : "MEDIUM",
      submissionMethod: lower.includes("classroom") ? "Google Classroom" : lower.includes("portal") ? "Student Portal" : "Course Submission Portal",
      reasoning: "Coursework assignment with actionable deadline detected.",
    }
  }

  if (isNote) {
    return {
      classification: "NOTE",
      isAcademic: true,
      confidence: 0.86,
      title: `${subjectCode} Study Cheatsheet & Key Concepts`,
      subjectCode,
      subjectName,
      subjectId: matchedSubject?.id,
      noteContent: `## ${subjectCode} Study Notes\n\nShared via WhatsApp Community:\n\n${text}\n\n### Key Takeaways\n- Review shared definitions & problem steps.\n- Focus on formulas for upcoming evaluation.`,
      noteType: lower.includes("formula") ? "FORMULA_SHEET" : "SUMMARY",
      priority: "MEDIUM",
      reasoning: "Helpful study material or formula sheet detected in study group.",
    }
  }

  if (isScheduleChange) {
    return {
      classification: "SCHEDULE_CHANGE",
      isAcademic: true,
      confidence: 0.89,
      title: `${subjectCode} Schedule Update`,
      subjectCode,
      subjectName,
      subjectId: matchedSubject?.id,
      description: text,
      priority: "HIGH",
      reasoning: "Notice regarding lecture cancellation or rescheduling.",
    }
  }

  // Default to general announcement
  return {
    classification: "ANNOUNCEMENT",
    isAcademic: true,
    confidence: 0.75,
    title: `${subjectCode} Notice`,
    subjectCode,
    subjectName,
    subjectId: matchedSubject?.id,
    description: text,
    priority: "MEDIUM",
    reasoning: "General academic announcement from study group.",
  }
}

/**
 * Commits an extracted WhatsApp item directly into the student's database models
 * (Assignment, AcademicEvent, StudyNote, Announcement, ActivityLog).
 */
export async function syncWhatsAppExtractionToDb(
  userId: string,
  extraction: ExtractionResult,
  rawMessage: string,
  groupName: string,
  sender: string = "WhatsApp Community"
) {
  // 1. Ensure or find matching Subject for the student
  let subjectId = extraction.subjectId

  if (!subjectId) {
    // Try finding by code or name
    const found = await prisma.subject.findFirst({
      where: {
        userId,
        OR: [
          { code: { equals: extraction.subjectCode || "GENERAL", mode: "insensitive" } },
          { name: { contains: extraction.subjectName || "Computer Science", mode: "insensitive" } },
        ],
      },
    })

    if (found) {
      subjectId = found.id
    } else {
      // Auto-create subject if it doesn't exist
      const newSubject = await prisma.subject.create({
        data: {
          userId,
          name: extraction.subjectName || extraction.subjectCode || "WhatsApp Course",
          code: extraction.subjectCode || "GEN-101",
          color: "#2563EB",
          semester: "Fall 2026",
          description: `Auto-created from WhatsApp group ${groupName}`,
        },
      })
      subjectId = newSubject.id
    }
  }

  let createdItemType: "assignment" | "event" | "note" | "announcement" = "announcement"
  let createdItemId = ""

  // 2. Insert into appropriate specialized table
  if (extraction.classification === "ASSIGNMENT") {
    const deadlineDate = extraction.deadline ? new Date(extraction.deadline) : null
    const createdAssignment = await prisma.assignment.create({
      data: {
        userId,
        subjectId,
        title: extraction.title,
        description: extraction.description || rawMessage,
        instructions: `Source: WhatsApp Group "${groupName}" (Shared by ${sender})\nSubmission: ${extraction.submissionMethod || "Standard Portal"}`,
        originalAnnouncement: rawMessage,
        deadline: deadlineDate,
        deadlineConfirmed: !!deadlineDate,
        priority: extraction.priority,
        submissionMethod: extraction.submissionMethod || "WhatsApp / Portal",
        status: "NOT_STARTED",
      },
    })
    createdItemType = "assignment"
    createdItemId = createdAssignment.id
  } else if (extraction.classification === "QUIZ" || extraction.classification === "EXAM") {
    const eventDate = extraction.eventDate
      ? new Date(extraction.eventDate)
      : extraction.deadline
      ? new Date(extraction.deadline)
      : new Date()

    const createdEvent = await prisma.academicEvent.create({
      data: {
        userId,
        subjectId,
        title: extraction.title,
        eventType: extraction.eventType || (extraction.classification === "QUIZ" ? "QUIZ" : "MIDTERM"),
        date: eventDate,
        startTime: eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        location: extraction.location || "Main Campus",
        description: extraction.description || rawMessage,
        originalAnnouncement: rawMessage,
        priority: extraction.priority,
        status: "UPCOMING",
        topics: {
          create: (extraction.topics || ["General Syllabus"]).map((t) => ({ topic: t })),
        },
      },
    })
    createdItemType = "event"
    createdItemId = createdEvent.id
  } else if (extraction.classification === "NOTE") {
    const createdNote = await prisma.studyNote.create({
      data: {
        userId,
        subjectId,
        title: extraction.title,
        content: extraction.noteContent || rawMessage,
        noteType: extraction.noteType || "SUMMARY",
        isGenerated: true,
      },
    })
    createdItemType = "note"
    createdItemId = createdNote.id
  }

  // 3. Always preserve the raw Announcement record for audit history & transparency
  const announcementCategory =
    extraction.classification === "ASSIGNMENT"
      ? "ASSIGNMENT"
      : extraction.classification === "QUIZ"
      ? "QUIZ"
      : extraction.classification === "EXAM"
      ? "EXAM"
      : extraction.classification === "SCHEDULE_CHANGE"
      ? "SCHEDULE_CHANGE"
      : "GENERAL"

  const announcement = await prisma.announcement.create({
    data: {
      userId,
      subjectId,
      title: extraction.title,
      originalMessage: rawMessage,
      category: announcementCategory,
      source: "WhatsApp",
      sourceGroup: groupName,
      extractedData: extraction as any,
      isProcessed: true,
    },
  })

  // 4. Log student activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: "WHATSAPP_EXTRACTED",
      entityType: createdItemType,
      entityId: createdItemId || announcement.id,
      details: {
        groupName,
        sender,
        classification: extraction.classification,
        title: extraction.title,
        confidence: extraction.confidence,
      },
    },
  }).catch(() => {})

  return {
    success: true,
    createdItemType,
    createdItemId: createdItemId || announcement.id,
    subjectId,
    announcementId: announcement.id,
    extraction,
  }
}
