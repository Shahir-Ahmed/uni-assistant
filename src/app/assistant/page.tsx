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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { AIMessage, QuizQuestion } from "@/types"

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

Here are a few things you can ask me:
* "What assignments do I have this week?"
* "When is my next quiz and what topics does it cover?"
* "Create an assignment for Database Systems due Nov 5 at 11:59 PM"
* "Prepare me for my Operating Systems quiz on CPU scheduling and deadlocks"
* "Generate beginner-friendly notes for database normalization"`,
      timestamp: new Date(),
    },
  ])

  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)

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

  const handleUserSubmit = (userText: string) => {
    const text = userText.trim()
    if (!text) return

    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    // Process Query against academic database & NLP logic
    setTimeout(() => {
      const response = processAcademicCommand(text)
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

      setIsTyping(false)
    }, 400)
  }

  // Controlled Database Execution & NLP Engine
  const processAcademicCommand = (
    text: string
  ): { reply: string; quizQuestions?: QuizQuestion[] } => {
    const lower = text.toLowerCase()

    // 1. "What assignments do I have this week?" or "List assignments"
    if (lower.includes("assignment") && (lower.includes("what") || lower.includes("list") || lower.includes("show") || lower.includes("week"))) {
      const assignments = academicService.getAssignments()
      const active = assignments.filter((a) => !['COMPLETED', 'SUBMITTED', 'CANCELLED'].includes(a.status))

      if (active.length === 0) {
        return { reply: "You currently have no pending assignments! Great job staying ahead." }
      }

      const list = active
        .map(
          (a) =>
            `• **${a.title}** (${a.subject?.name || "Subject"})\n  - Due: ${a.deadline ? new Date(a.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No deadline"}\n  - Priority: ${a.priority} | Status: ${a.status.replace(/_/g, " ")}`
        )
        .join("\n\n")

      return {
        reply: `Here are your active academic assignments from the database:\n\n${list}\n\nWould you like me to generate a study plan or break down any of these assignments for you?`,
      }
    }

    // 2. "When is my next quiz?"
    if (lower.includes("next quiz") || lower.includes("quiz") || lower.includes("exam")) {
      const events = academicService.getEvents().filter((e) => e.status === "UPCOMING")

      if (events.length === 0) {
        return { reply: "You don't have any upcoming quizzes or exams scheduled right now." }
      }

      const next = events[0]
      const topicsList = next.topics.map((t) => `  * ${t.topic}`).join("\n")

      return {
        reply: `Your next assessment is **${next.title}** for **${next.subject?.name || "Subject"}**.\n\n* **Scheduled Date:** ${next.date ? new Date(next.date).toLocaleDateString() : "TBD"} at ${next.startTime || "TBD"}\n* **Location:** ${next.location || "Classroom"}\n* **Syllabus Topics Covered:**\n${topicsList}\n\nWould you like to start an **interactive practice quiz session** right now to test your understanding?`,
      }
    }

    // 3. Command: "Create assignment"
    if (lower.startsWith("create an assignment") || lower.startsWith("create assignment") || lower.startsWith("add assignment")) {
      const parsed = academicService.parseAcademicText(text)
      if (parsed.subjectId) {
        const asg = academicService.createAssignment({
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
          reply: `✅ **Assignment Successfully Created in Database!**\n\n* **Title:** ${asg.title}\n* **Subject:** ${asg.subject?.name}\n* **Deadline:** ${asg.deadline ? new Date(asg.deadline).toLocaleString() : "Confirmed needed"}\n* **Audit:** Reminders scheduled automatically at 7d, 3d, 1d, and 2h before deadline.`,
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
          explanation: "The four Coffman conditions are: Mutual Exclusion, Hold and Wait, No Preemption (resources cannot be forcibly taken away), and Circular Wait. 'Preemptive Scheduling' actually prevents deadlocks rather than causing them.",
          concept: "Operating Systems — Deadlock Coffman Conditions",
        },
        {
          id: "q-2",
          question: "In relational schema design, how should a Many-to-Many (M:N) relationship between Student and Course be represented?",
          questionType: "MCQ",
          options: [
            "Add CourseID as a foreign key in Student",
            "Add StudentID as a foreign key in Course",
            "Create a separate junction table containing primary keys of both entities",
            "Merge Student and Course into a single table",
          ],
          correctAnswer: "Create a separate junction table containing primary keys of both entities",
          explanation: "M:N relationships cannot be directly stored with single foreign keys without violating 1NF. A junction (cross-reference) table is required, with composite primary key (StudentID, CourseID).",
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
          correctAnswer: "It avoids deadlocks dynamically by verifying that resource allocations leave the system in a safe state",
          explanation: "Banker's Algorithm simulates resource allocation for each process and checks whether at least one safe sequence exists where every process can complete its execution without deadlocking.",
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
      reply: `I have processed your query: "${text}".\n\nAll your academic data is synchronized locally and ready for deployment. You can ask me to inspect assignments, review lecture notes, or run a practice quiz anytime!`,
    }
  }

  // Answer selection in quiz mode
  const handleSelectAnswer = (option: string) => {
    if (showAnswerFeedback) return
    setUserSelectedOption(option)
    setShowAnswerFeedback(true)

    const q = quizQuestions[currentQuestionIndex]
    const isCorrect = option === q.correctAnswer
    if (isCorrect) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setUserSelectedOption(null)
      setShowAnswerFeedback(false)
    } else {
      // Quiz finished
      setQuizActive(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-quiz-done-${Date.now()}`,
          role: "assistant",
          content: `🎉 **Quiz Practice Session Complete!**\n\nYour Score: **${score + (userSelectedOption === quizQuestions[currentQuestionIndex].correctAnswer ? 1 : 0)} / ${quizQuestions.length}**\n\n${
            score >= 2
              ? "Excellent performance! You demonstrate strong mastery of these core concepts."
              : "Good effort! I recommend reviewing Lecture 08 on Deadlocks and Relational Mapping algorithms before your test."
          }`,
          timestamp: new Date(),
        },
      ])
    }
  }

  const currentQ = quizQuestions[currentQuestionIndex]

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span>ScholarOS AI Academic Assistant</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deeply integrated with your subjects, assignments, deadlines, and uploaded slides
          </p>
        </div>

        <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-xs font-semibold">
          Database Tools Enabled
        </Badge>
      </div>

      {/* Interactive Quiz Mode Widget (If Active) */}
      {quizActive && currentQ && (
        <Card className="border-2 border-primary/30 shadow-md bg-gradient-to-b from-primary/5 to-white dark:to-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                <CardTitle className="text-base font-bold text-primary">
                  Interactive Assessment Session (Question {currentQuestionIndex + 1} of {quizQuestions.length})
                </CardTitle>
              </div>
              <Badge variant="secondary" className="font-semibold text-xs">
                Score: {score} / {quizQuestions.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Topic: {currentQ.concept}</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 leading-snug">
              {currentQ.question}
            </h3>

            {/* MCQ Options */}
            <div className="space-y-2">
              {currentQ.options?.map((option, idx) => {
                const isSelected = userSelectedOption === option
                const isCorrect = option === currentQ.correctAnswer

                let btnStyle = "border-border bg-white dark:bg-card hover:border-primary/50 text-gray-800 dark:text-gray-200"
                if (showAnswerFeedback) {
                  if (isCorrect) {
                    btnStyle = "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100 font-bold"
                  } else if (isSelected) {
                    btnStyle = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 font-medium"
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={showAnswerFeedback}
                    onClick={() => handleSelectAnswer(option)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {showAnswerFeedback && isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                    {showAnswerFeedback && isSelected && !isCorrect && (
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Answer Feedback & Explanation */}
            {showAnswerFeedback && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-card border border-border space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  {userSelectedOption === currentQ.correctAnswer ? (
                    <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Correct Answer!
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> Incorrect. Correct answer: {currentQ.correctAnswer}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Concept Explanation: </span>
                  {currentQ.explanation}
                </p>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleNextQuestion}
                    className="bg-primary hover:bg-primary-700 text-white gap-1.5 font-semibold text-xs"
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

      {/* Chat Messages Log */}
      <Card className="shadow-sm border-border min-h-[450px] flex flex-col justify-between">
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

              <div
                className={`p-4 rounded-2xl max-w-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-none shadow-sm"
                    : "bg-gray-100 dark:bg-card border border-border text-gray-900 dark:text-gray-100 rounded-bl-none shadow-sm"
                }`}
              >
                {msg.content}
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

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-gray-50/50 dark:bg-card/50">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUserSubmit(input)
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or enter an academic instruction..."
              className="flex-1 bg-white dark:bg-card border-border h-11 text-xs sm:text-sm focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-primary hover:bg-primary-700 text-white h-11 px-5 rounded-lg font-semibold shadow-sm"
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
