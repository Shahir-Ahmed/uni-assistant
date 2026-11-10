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
import { assistantEngine } from "@/lib/assistant-engine"
import { StructuredMessage } from "@/components/chat/StructuredMessage"

function AssistantContent() {
  const searchParams = useSearchParams()
  const prepQuery = searchParams.get("prep")
  const subjectQuery = searchParams.get("subject")

  const [messages, setMessages] = React.useState<AIMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `Welcome to your Academic Copilot.
Connected directly to your university courses, assignments, and exam schedule.

Suggested queries:
* "What assignments do I have this week?"
* "When is my next quiz and what topics does it cover?"
* "Explain CPU scheduling algorithms and turnaround metrics"
* Attach lecture slides or PDF notes to extract key concepts and generate study guides.`,
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

  const messagesRef = React.useRef(messages)
  messagesRef.current = messages

  const handleUserSubmit = React.useCallback(
    async (userText: string, attachedFile?: FileAttachment | null) => {
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
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            attachment: activeAttachment,
            history: messagesRef.current.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          }),
        })

        let response: { reply: string; quizQuestions?: QuizQuestion[]; model?: string }
        if (res.ok) {
          response = await res.json()
        } else {
          response = await assistantEngine.process(text, activeAttachment)
        }

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
        console.error("Failed to process assistant command via API, using fallback:", err)
        const fallback = await assistantEngine.process(text, activeAttachment)
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content: fallback.reply,
            timestamp: new Date(),
          },
        ])
        if (fallback.quizQuestions && fallback.quizQuestions.length > 0) {
          setQuizQuestions(fallback.quizQuestions)
          setCurrentQuestionIndex(0)
          setUserSelectedOption(null)
          setShowAnswerFeedback(false)
          setScore(0)
          setQuizActive(true)
        }
      } finally {
        setIsTyping(false)
      }
    },
    [currentAttachment]
  )

  // Initialize with prep query if present
  React.useEffect(() => {
    if (prepQuery) {
      handleUserSubmit(`Prepare me for ${prepQuery} using uploaded slides.`)
    } else if (subjectQuery) {
      handleUserSubmit(`Show me an overview of ${subjectQuery} including pending assignments and uploaded notes.`)
    }
  }, [prepQuery, subjectQuery, handleUserSubmit])

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setMessages([
                {
                  id: "msg-welcome",
                  role: "assistant",
                  content: "Welcome to your Academic Copilot. How can I assist with your coursework, assignments, or exam preparation today?",
                  timestamp: new Date(),
                },
              ])
              setQuizActive(false)
            }}
            className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
          Suggested:
        </span>
        <button
          type="button"
          onClick={() => handleUserSubmit("What assignments do I have this week?")}
          className="px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium shrink-0 transition-colors text-xs shadow-xs"
        >
          Pending Work
        </button>
        <button
          type="button"
          onClick={() => handleUserSubmit("When is my next quiz and what topics does it cover?")}
          className="px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium shrink-0 transition-colors text-xs shadow-xs"
        >
          Next Assessment
        </button>
        <button
          type="button"
          onClick={() => handleUserSubmit("Add subject Cloud Computing (CS-408), instructor Dr. Farhan")}
          className="px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium shrink-0 transition-colors text-xs shadow-xs"
        >
          Add Course
        </button>
        <button
          type="button"
          onClick={() => handleUserSubmit("Create study notes for Database Systems on BCNF vs 3NF with examples")}
          className="px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium shrink-0 transition-colors text-xs shadow-xs"
        >
          Study Guide
        </button>
        <button
          type="button"
          onClick={() => handleUserSubmit("Practice quiz on Operating Systems")}
          className="px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium shrink-0 transition-colors text-xs shadow-xs"
        >
          Practice Quiz
        </button>
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
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-card border border-border text-gray-900 dark:text-gray-100 rounded-bl-none"
                  }`}
                >
                  <StructuredMessage content={msg.content} isUser={msg.role === "user"} />
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
