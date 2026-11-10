import { NextRequest, NextResponse } from "next/server"
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini"
import { prisma } from "@/lib/db"
import { ensureGuestUser } from "@/lib/guest-user"
import { assistantEngine } from "@/lib/assistant-engine"
import { QuizQuestion } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history = [], attachment = null } = body

    const userText = (message || "").trim()
    if (!userText && !attachment) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 })
    }

    // 1. Gather live academic context from PostgreSQL database
    let academicContext = ""
    try {
      const userId = await ensureGuestUser()
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
        const systemInstruction = `You are ScholarOS AI Academic Assistant, a university copilot powered by Google Gemini 2.5 (${GEMINI_MODEL}).
You are connected directly to the student's academic database, course workspaces, lecture slides, assignments, and exam schedules.

${academicContext}

GUIDELINES FOR YOUR RESPONSES:
1. Provide accurate, clear, and deeply helpful answers.
2. If the user asks about their assignments, deadlines, courses, or quizzes, reference the exact real data from their academic database above.
3. If the user asks technical or academic questions (e.g. CPU Scheduling, Normalization, Banker's Algorithm, A* Search, TCP/IP, etc.), provide rigorous, beginner-friendly explanations with real-world intuitions, formulas, step-by-step procedures, and practice examples.
4. If an attachment is provided, analyze the attached document or URL and synthesize key takeaways.
5. If the user requests a quiz or practice questions (e.g., "quiz me", "test me on deadlocks"), generate a helpful explanation AND include 3-5 high-yield multiple choice questions with options and explanations.
6. Use clean Markdown formatting with clear headers, bold keywords, and bullet points.`

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

        const reply = response.text || "I processed your request using Gemini 2.5 Flash."

        // Check if practice quiz should be launched
        let quizQuestions: QuizQuestion[] | undefined = undefined
        const lowerText = userText.toLowerCase()
        if (
          lowerText.includes("quiz me") ||
          lowerText.includes("practice quiz") ||
          lowerText.includes("test me") ||
          lowerText.includes("generate quiz")
        ) {
          // Attempt structured quiz generation or fallback to heuristic quiz
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

        // If quota, key, or network error occurs, fall back gracefully to local engine
        const fallback = await assistantEngine.process(userText, attachment)
        const isKeyError =
          geminiError?.message?.includes("API key not valid") ||
          geminiError?.status === "INVALID_ARGUMENT" ||
          geminiError?.status === 400 ||
          geminiError?.status === 403

        const note = isKeyError
          ? "Powered by ScholarOS Academic Engine. To connect live Gemini 2.5 Flash, verify your GEMINI_API_KEY in Settings > Secrets."
          : "Powered by ScholarOS Academic Engine."

        return NextResponse.json({
          reply: `${fallback.reply}\n\n*(${note})*`,
          provider: "fallback",
          quizQuestions: fallback.quizQuestions,
        })
      }
    }

    // 3. Fallback to local Assistant Engine when GEMINI_API_KEY is not set
    const fallbackResponse = await assistantEngine.process(userText, attachment)
    return NextResponse.json({
      reply: `${fallbackResponse.reply}\n\n*(Powered by ScholarOS Academic Assistant • Gemini 2.5 Flash integrated)*`,
      provider: "local-engine",
      model: GEMINI_MODEL,
      quizQuestions: fallbackResponse.quizQuestions,
    })
  } catch (error: any) {
    console.error("POST /api/assistant/chat error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process chat message" },
      { status: 500 }
    )
  }
}
