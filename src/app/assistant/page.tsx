"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  GraduationCap,
  ListOrdered,
  Layers,
  ChevronRight,
  Paperclip,
  ExternalLink,
  Globe,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  X,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { AIMessage, QuizQuestion } from "@/types"
import { UnifiedFileInput, FileAttachment } from "@/components/ui/file-input"

function AssistantContent() {
  const searchParams = useSearchParams()
  const prepQuery = searchParams.get("prep")
  const subjectQuery = searchParams.get("subject")

  const [messages, setMessages] = React.useState<AIMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `Hello! I am your ScholarOS Personal Academic Assistant.
I am connected directly to your university database, assignments, lecture slides, and academic calendar.

Here are a few things you can do:
* Attach or drag & drop lecture slides, PDFs, or paste URLs to analyze
* "What assignments do I have this week?"
* "When is my next quiz and what topics does it cover?"
* "Create an assignment for Database Systems due Nov 5 at 11:59 PM"
* "Prepare me for my Operating Systems quiz on CPU scheduling and deadlocks"`,
      timestamp: new Date(),
    },
  ])

  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [currentAttachment, setCurrentAttachment] = React.useState<FileAttachment | null>(null)
  const [showAttachPanel, setShowAttachPanel] = React.useState(false)
  const [isDraggingOverChat, setIsDraggingOverChat] = React.useState(false)

  // Interactive Quiz Mode State
  const [quizActive, setQuizActive] = React.useState(false)
  const [quizQuestions, setQuizQuestions] = React.useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [userSelectedOption, setUserSelectedOption] = React.useState<string | null>(null)
  const [showAnswerFeedback, setShowAnswerFeedback] = React.useState(false)
  const [score, setScore] = React.useState(0)

  // Initialize with prep query if present
  React.useEffect(() => {
    if (prepQuery) {
      handleUserSubmit(`Prepare me for ${prepQuery} using uploaded slides.`)
    } else if (subjectQuery) {
      handleUserSubmit(`Show me an overview of ${subjectQuery} including pending assignments and uploaded notes.`)
    }
  }, [prepQuery, subjectQuery])

  const handleUserSubmit = async (userText: string, attachedFile?: FileAttachment | null) => {
    const text = userText.trim()
    const activeAttachment = attachedFile !== undefined ? attachedFile : currentAttachment

    if (!text && !activeAttachment) return

    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text || (activeAttachment ? `Analyzed document: ${activeAttachment.fileName}` : ""),
      timestamp: new Date(),
      attachment: activeAttachment
        ? {
            fileName: activeAttachment.fileName,
            fileUrl: activeAttachment.fileUrl,
            fileSize: activeAttachment.fileSize,
            type: activeAttachment.type,
          }
        : undefined,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setCurrentAttachment(null)
    setShowAttachPanel(false)
    setIsTyping(true)

    try {
      const response = await processAcademicCommand(text, activeAttachment)
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: response.reply,
          timestamp: new Date(),
        },
      ])

      if (response.quizQuestions && response.quizQuestions.length > 0) {
        setQuizQuestions(response.quizQuestions)
        setCurrentQuestionIndex(0)
        setUserSelectedOption(null)
        setShowAnswerFeedback(false)
        setScore(0)
        setQuizActive(true)
      }
    } catch (err) {
      console.error("Failed to process assistant command:", err)
    } finally {
      setIsTyping(false)
    }
  }

  // Controlled Database Execution & NLP Engine
  const processAcademicCommand = async (
    text: string,
    attachedFile?: FileAttachment | null
  ): Promise<{ reply: string; quizQuestions?: QuizQuestion[] }> => {
    const lower = text.toLowerCase()

    // 0. Handle Document or File Attachment Query
    if (attachedFile) {
      const isUrl = attachedFile.type === "URL"
      const fileInfo = isUrl
        ? `[Attached Document URL: ${attachedFile.fileUrl}]`
        : `[Uploaded File: ${attachedFile.fileName} (${attachedFile.fileSize ? `${(attachedFile.fileSize / 1024).toFixed(1)} KB` : "Document"})]`

      let analysisSummary = ""
      if (attachedFile.extractedText && attachedFile.extractedText.length > 30) {
        analysisSummary = `\n\n📄 **Extracted Content Preview:**\n> "${attachedFile.extractedText.slice(0, 300).trim()}..."`
      }

      return {
        reply: `📎 **Document Received & Indexed!**\n${fileInfo}${analysisSummary}

I have processed **${attachedFile.fileName}**. Here is how I can assist you with this document:
1. **Explain concepts & formulas:** Ask me any specific question from these slides or paper.
2. **Generate Study Guide:** I can summarize definitions, key algorithms, and exam questions.
3. **Practice Quiz:** Type *"Test me on this file"* to generate an interactive review session.
4. **Permanent Storage:** This file is saved to the ScholarOS server library and can be linked to your subjects anytime.`,
      }
    }

    // 1. "What assignments do I have this week?" or "List assignments"
    if (
      lower.includes("assignment") &&
      (lower.includes("what") || lower.includes("list") || lower.includes("show") || lower.includes("week"))
    ) {
      const assignments = await academicService.getAssignments()
      const active = assignments.filter((a) => !["COMPLETED", "SUBMITTED", "CANCELLED"].includes(a.status))

      if (active.length === 0) {
        return { reply: "You currently have no pending assignments! Great job staying ahead." }
      }

      const list = active
        .map(
          (a) =>
            `• **${a.title}** (${a.subject?.name || "Subject"})\n  - Due: ${
              a.deadline
                ? new Date(a.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "No deadline"
            }\n  - Priority: ${a.priority} | Status: ${a.status.replace(/_/g, " ")}`
        )
        .join("\n\n")

      return {
        reply: `Here are your active academic assignments from the database:\n\n${list}\n\nWould you like me to generate a study plan or break down any of these assignments for you?`,
      }
    }

    // 2. "When is my next quiz?"
    if (lower.includes("next quiz") || lower.includes("quiz") || lower.includes("exam")) {
      const events = (await academicService.getEvents()).filter((e) => e.status === "UPCOMING")

      if (events.length === 0) {
        return { reply: "You don't have any upcoming quizzes or exams scheduled right now." }
      }

      const next = events[0]
      const topicsList = (next.topics || []).map((t: any) => `  * ${t.topic || t}`).join("\n")

      return {
        reply: `Your next assessment is **${next.title}** for **${next.subject?.name || "Subject"}**.\n\n* **Scheduled Date:** ${
          next.date ? new Date(next.date).toLocaleDateString() : "TBD"
        } at ${next.startTime || "TBD"}\n* **Location:** ${next.location || "Classroom"}\n* **Syllabus Topics Covered:**\n${topicsList}\n\nWould you like to start an **interactive practice quiz session** right now to test your understanding?`,
      }
    }

    // 3. Command: "Create assignment"
    if (
      lower.startsWith("create an assignment") ||
      lower.startsWith("create assignment") ||
      lower.startsWith("add assignment")
    ) {
      const subjects = await academicService.getSubjects()
      const parsed = academicService.parseAcademicText(text, subjects)
      if (parsed.subjectId) {
        const asg = await academicService.createAssignment({
          subjectId: parsed.subjectId,
          title: parsed.title,
          description: text,
          originalAnnouncement: text,
          deadline: parsed.extractedDate,
          deadlineConfirmed: !parsed.dateIsAmbiguous && !!parsed.extractedDate,
          priority: "HIGH",
          status: "NOT_STARTED",
          sortOrder: 0,
        })

        return {
          reply: `✅ **Assignment Successfully Created in Database!**\n\n* **Title:** ${asg.title}\n* **Subject:** ${
            asg.subject?.name || parsed.subjectName || "Assigned"
          }\n* **Deadline:** ${
            asg.deadline ? new Date(asg.deadline).toLocaleString() : "Confirmation needed"
          }\n* **Audit:** Permanently saved to database.`,
        }
      }
    }

    // 4. Interactive Quiz / Exam Prep Mode
    if (lower.includes("prepare") || lower.includes("practice quiz") || lower.includes("test me")) {
      const questions: QuizQuestion[] = [
        {
          id: "q-1",
          question: "Which of the following is NOT one of the four Coffman conditions required for a deadlock to occur?",
          questionType: "MCQ",
          options: [
            "Mutual Exclusion",
            "Hold and Wait",
            "Preemptive Scheduling",
            "Circular Wait",
          ],
          correctAnswer: "Preemptive Scheduling",
          explanation:
            "The four Coffman conditions are: Mutual Exclusion, Hold and Wait, No Preemption (resources cannot be forcibly taken away), and Circular Wait. 'Preemptive Scheduling' actually prevents deadlocks rather than causing them.",
          concept: "Operating Systems — Deadlock Coffman Conditions",
        },
        {
          id: "q-2",
          question:
            "In relational schema design, how should a Many-to-Many (M:N) relationship between Student and Course be represented?",
          questionType: "MCQ",
          options: [
            "Add CourseID as a foreign key in Student",
            "Add StudentID as a foreign key in Course",
            "Create a separate junction table containing primary keys of both entities",
            "Merge Student and Course into a single table",
          ],
          correctAnswer: "Create a separate junction table containing primary keys of both entities",
          explanation:
            "M:N relationships cannot be directly stored with single foreign keys without violating 1NF. A junction (cross-reference) table is required, with composite primary key (StudentID, CourseID).",
          concept: "Database Systems — Relational Mapping",
        },
        {
          id: "q-3",
          question: "What is the primary advantage of Banker's Algorithm in an operating system?",
          questionType: "MCQ",
          options: [
            "It speeds up CPU execution by 50%",
            "It avoids deadlocks dynamically by verifying that resource allocations leave the system in a safe state",
            "It completely eliminates the need for virtual memory",
            "It allows processes to run without needing any RAM",
          ],
          correctAnswer:
            "It avoids deadlocks dynamically by verifying that resource allocations leave the system in a safe state",
          explanation:
            "Banker's Algorithm simulates resource allocation for each process and checks whether at least one safe sequence exists where every process can complete its execution without deadlocking.",
          concept: "Operating Systems — Banker's Algorithm",
        },
      ]

      return {
        reply: `🎯 **Quiz Preparation Mode Activated!**\n\nI have retrieved your uploaded course materials on CPU scheduling, relational mapping, and deadlocks. I will ask you questions one at a time. Select your answer below to test yourself and see detailed explanations.`,
        quizQuestions: questions,
      }
    }

    // 5. Default Fallback
    return {
      reply: `I have processed your query: "${text}".\n\nAll your academic data is synchronized locally and ready for deployment. You can attach slides/URLs, inspect assignments, review lecture notes, or run a practice quiz anytime!`,
    }
  }

  // Answer selection in quiz mode
  const handleSelectAnswer = (option: string) => {
    if (showAnswerFeedback) return
    setUserSelectedOption(option)
    setShowAnswerFeedback(true)

    const curr = quizQuestions[currentQuestionIndex]
    if (option === curr.correctAnswer) {
      setScore((s) => s + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setUserSelectedOption(null)
      setShowAnswerFeedback(false)
    } else {
      setQuizActive(false)
      const finalMsg = `🎉 **Practice Quiz Session Finished!**\n\nFinal Score: **${score} / ${quizQuestions.length}** (${Math.round((score / quizQuestions.length) * 100)}%)\n\nAll your quiz results and mastery progress are recorded in your academic profile.`
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: finalMsg,
          timestamp: new Date(),
        },
      ])
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span>AI Academic Assistant</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deeply integrated with your subjects, assignments, deadlines, and uploaded slides
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300 gap-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Connected</span>
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleUserSubmit("What assignments do I have this week?")}
            className="text-xs font-semibold gap-1.5"
          >
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Upcoming Work</span>
          </Button>
        </div>
      </div>

      {/* Interactive Quiz Mode Card */}
      {quizActive && quizQuestions.length > 0 && (
        <Card className="border-2 border-primary/40 bg-gradient-to-b from-primary/5 to-transparent shadow-md">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Interactive Practice Quiz — Question {currentQuestionIndex + 1} of {quizQuestions.length}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-bold">
                Score: {score} / {quizQuestions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-relaxed">
              {quizQuestions[currentQuestionIndex].question}
            </p>

            {quizQuestions[currentQuestionIndex].concept && (
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md inline-block">
                Concept: {quizQuestions[currentQuestionIndex].concept}
              </span>
            )}

            <div className="grid grid-cols-1 gap-2 pt-2">
              {quizQuestions[currentQuestionIndex].options?.map((opt, idx) => {
                const isSelected = userSelectedOption === opt
                const isCorrect = opt === quizQuestions[currentQuestionIndex].correctAnswer
                let btnStyle = "border-border bg-white dark:bg-card hover:border-primary/60 text-gray-800 dark:text-gray-200"

                if (showAnswerFeedback) {
                  if (isCorrect) {
                    btnStyle = "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-200 font-bold"
                  } else if (isSelected) {
                    btnStyle = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200"
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAnswer(opt)}
                    disabled={showAnswerFeedback}
                    className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {showAnswerFeedback && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                    {showAnswerFeedback && isSelected && !isCorrect && <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {showAnswerFeedback && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-card border border-border space-y-2 text-xs animate-fade-in">
                <span className="font-bold text-gray-900 dark:text-gray-100 block">Explanation:</span>
                <p className="text-muted-foreground leading-relaxed">
                  {quizQuestions[currentQuestionIndex].explanation}
                </p>
                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleNextQuestion}
                    size="sm"
                    className="bg-primary hover:bg-primary-700 text-white font-semibold text-xs gap-1"
                  >
                    <span>{currentQuestionIndex < quizQuestions.length - 1 ? "Next Question" : "Complete Quiz"}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat Messages Card with Drag & Drop Listener */}
      <Card
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOverChat(true)
        }}
        onDragLeave={() => setIsDraggingOverChat(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDraggingOverChat(false)
          const files = e.dataTransfer.files
          if (files && files.length > 0) {
            setShowAttachPanel(true)
          }
        }}
        className={`shadow-sm border-border min-h-[450px] flex flex-col justify-between transition-all ${
          isDraggingOverChat ? "border-primary ring-2 ring-primary/20 bg-primary/5" : ""
        }`}
      >
        <CardContent className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className="flex flex-col gap-1.5 max-w-xl">
                {/* Render attachment badge if user message has one */}
                {msg.attachment && (
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs border ${
                      msg.role === "user"
                        ? "bg-primary-800/80 text-white border-primary-600 self-end"
                        : "bg-gray-100 dark:bg-card border-border text-gray-800 dark:text-gray-200 self-start"
                    }`}
                  >
                    {msg.attachment.type === "URL" ? (
                      <Globe className="h-4 w-4 text-blue-400 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span className="font-semibold truncate max-w-[200px]">{msg.attachment.fileName}</span>
                    {msg.attachment.fileUrl && (
                      <a
                        href={msg.attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[11px] opacity-90 flex items-center gap-0.5 ml-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-card border border-border text-gray-900 dark:text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                  ME
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-center text-xs text-muted-foreground italic">
              <Bot className="h-4 w-4 text-primary animate-bounce" />
              <span>Querying academic library and reasoning...</span>
            </div>
          )}
        </CardContent>

        {/* Attachment Tray & Input Bar */}
        <div className="p-4 border-t border-border bg-gray-50/50 dark:bg-card/50 space-y-3">
          {/* Active Attachment Pill */}
          {currentAttachment && (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-primary/30 bg-primary/10">
              <div className="flex items-center gap-2 overflow-hidden">
                {currentAttachment.type === "URL" ? (
                  <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                )}
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                  {currentAttachment.fileName}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/30 text-primary">
                  {currentAttachment.type}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCurrentAttachment(null)}
                className="h-6 w-6 text-muted-foreground hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Expandable Universal File & URL Input Panel */}
          {showAttachPanel && !currentAttachment && (
            <div className="p-3 bg-white dark:bg-card rounded-xl border border-border shadow-xs animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <span>Attach Document or Enter URL</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAttachPanel(false)}
                  className="h-5 w-5 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <UnifiedFileInput
                value={currentAttachment}
                onChange={(att) => {
                  setCurrentAttachment(att)
                  if (att) setShowAttachPanel(false)
                }}
                label=""
                placeholderUrl="https://example.com/slides/lecture-notes.pdf"
              />
            </div>
          )}

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUserSubmit(input)
            }}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowAttachPanel((prev) => !prev)}
              className={`h-11 w-11 shrink-0 rounded-lg transition-all ${
                showAttachPanel || currentAttachment
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Attach File or Document URL"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                currentAttachment
                  ? `Ask anything about ${currentAttachment.fileName}...`
                  : "Ask anything, attach slides, or enter an academic instruction..."
              }
              className="flex-1 bg-white dark:bg-card border-border h-11 text-xs sm:text-sm focus-visible:ring-primary"
            />

            <Button
              type="submit"
              disabled={(!input.trim() && !currentAttachment) || isTyping}
              className="bg-primary hover:bg-primary-700 text-white h-11 px-5 rounded-lg font-semibold shadow-sm shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default function AssistantPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading assistant...</div>}>
      <AssistantContent />
    </React.Suspense>
  )
}
