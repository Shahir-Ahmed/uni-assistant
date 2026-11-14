import { NextRequest, NextResponse } from "next/server"
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { assistantEngine } from "@/lib/assistant-engine"
import { QuizQuestion } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureGuestUser(req)
    const body = await req.json()
    const { message, history = [], attachment = null } = body

    const userText = (message || "").trim()
    if (!userText && !attachment) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 })
    }

    // 1. Gather live academic context from PostgreSQL database
    let academicContext = ""
    try {
      const [subjects, assignments, events, resources] = await Promise.all([
        prisma.subject.findMany({
          where: { userId, isArchived: false },
          select: { name: true, code: true, instructor: true, description: true },
        }),
        prisma.assignment.findMany({
          where: { userId },
          include: { subject: { select: { name: true, code: true } } },
          orderBy: { deadline: "asc" },
        }),
        prisma.academicEvent.findMany({
          where: { userId },
          include: {
            subject: { select: { name: true } },
            topics: { select: { topic: true } },
          },
          orderBy: { date: "asc" },
        }),
        prisma.resource.findMany({
          where: { userId },
          include: {
            subject: { select: { name: true } },
            extractedTexts: { select: { slideNumber: true, content: true } },
          },
          take: 5,
        }),
      ])

      const subjectsSummary = subjects
        .map((s) => `- ${s.name} (${s.code || "No code"}), Instructor: ${s.instructor || "N/A"}`)
        .join("\n")

      const assignmentsSummary = assignments
        .map(
          (a) =>
            `- [${a.status}] "${a.title}" for ${a.subject?.name || "General"} | Due: ${
              a.deadline ? new Date(a.deadline).toLocaleDateString() : "No deadline"
            } | Priority: ${a.priority} | Est: ${a.estimatedEffort || "N/A"}`
        )
        .join("\n")

      const eventsSummary = events
        .map(
          (e) =>
            `- [${e.eventType}] "${e.title}" for ${e.subject?.name || "General"} | Date: ${
              e.date ? new Date(e.date).toLocaleDateString() : "TBD"
            } | Topics: ${e.topics.map((t) => t.topic).join(", ") || "General syllabus"}`
        )
        .join("\n")

      const resourcesSummary = resources
        .map(
          (r) =>
            `- Slide/Resource "${r.title}" (${r.fileName || "doc"}): ${
              r.extractedTexts?.[0]?.content?.slice(0, 150) || "Document material"
            }`
        )
        .join("\n")

      academicContext = `
STUDENT'S ACADEMIC DATABASE:
Enrolled Subjects:
${subjectsSummary || "None"}

Assignments & Deadlines:
${assignmentsSummary || "None"}

Upcoming Quizzes & Exams:
${eventsSummary || "None"}

Indexed Lecture Materials & Slides:
${resourcesSummary || "None"}
`
    } catch (dbErr) {
      console.warn("Could not load full academic context for Gemini:", dbErr)
    }

    // 2. Check if Gemini Client is initialized
    const ai = getGeminiClient()

    if (ai) {
      try {
        const systemInstruction = `You are ScholarOS Academic Copilot, a high-level university assistant.
You have direct read access to the student's academic database, course workspaces, lecture materials, assignments, and exam schedules.

${academicContext}

OUTPUT STRUCTURE & FORMATTING RULES:
1. Deliver structured, clear, and professional responses.
2. Use Markdown hierarchy: ## Section Title, ### Subsection, bullet points (* ), and clean Markdown tables for multi-item comparisons or schedules.
3. Keep the tone concise, authoritative, and direct. Avoid conversational filler (e.g. do not say "Sure! Here is...", "I hope this helps!").
4. Never include irrelevant decorative emojis, random symbols, or model self-references.
5. Never include trailing disclaimers, signatures, or status notes (such as "*(Note: ...)*", "*(Powered by ...)*", or "Database status").
6. When answering course/assignment/quiz questions, present the actual database facts in a neat table or structured bulleted list (Name, Course, Deadline, Priority, Status).
7. For technical or academic queries (e.g., CPU scheduling, Normalization, Banker's algorithm, Search algorithms), provide rigorous theoretical foundations, exact formulas, step-by-step procedures, and concrete examples.`

        // Prepare contents
        const contents: any[] = []

        // Append recent chat history if provided
        if (Array.isArray(history) && history.length > 0) {
          for (const msg of history.slice(-4)) {
            if (msg.role && msg.content) {
              contents.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
              })
            }
          }
        }

        // Current user message and attachment
        const currentParts: any[] = []
        if (attachment) {
          currentParts.push({
            text: `[Attached Document: ${attachment.fileName} (${attachment.type})]\n${
              attachment.extractedText || "No text extracted from document"
            }\n\n`,
          })
        }
        currentParts.push({ text: userText || "Analyze the attached document" })

        contents.push({
          role: "user",
          parts: currentParts,
        })

        // Call Gemini 2.5 Flash
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction,
          },
        })

        const reply = response.text || "Academic request processed successfully."

        // Check if practice quiz should be launched
        let quizQuestions: QuizQuestion[] | undefined = undefined
        const lowerText = userText.toLowerCase()
        if (
          lowerText.includes("quiz me") ||
          lowerText.includes("practice quiz") ||
          lowerText.includes("test me") ||
          lowerText.includes("generate quiz")
        ) {
          const localQuiz = await assistantEngine.process(userText, attachment)
          if (localQuiz.quizQuestions && localQuiz.quizQuestions.length > 0) {
            quizQuestions = localQuiz.quizQuestions
          }
        }

        return NextResponse.json({
          reply,
          model: GEMINI_MODEL,
          provider: "gemini",
          quizQuestions,
        })
      } catch (geminiError: any) {
        console.error("Gemini API generation error:", geminiError)

        // Fall back gracefully to local academic engine without trailing disclaimers
        const fallback = await assistantEngine.process(userText, attachment)

        return NextResponse.json({
          reply: fallback.reply,
          provider: "fallback",
          quizQuestions: fallback.quizQuestions,
        })
      }
    }

    // 3. Fallback to local Assistant Engine when GEMINI_API_KEY is not configured
    const fallbackResponse = await assistantEngine.process(userText, attachment)
    return NextResponse.json({
      reply: fallbackResponse.reply,
      provider: "local-engine",
      model: GEMINI_MODEL,
      quizQuestions: fallbackResponse.quizQuestions,
    })
  } catch (error: any) {
    console.error("POST /api/assistant/chat error:", error)
    const status = error?.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json(
      { error: error.message || "Failed to process chat message" },
      { status }
    )
  }
}
