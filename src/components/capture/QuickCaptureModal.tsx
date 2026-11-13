"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { Subject, AssignmentStatus, Priority } from "@/types"
import { Sparkles, Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react"
import { UnifiedFileInput, FileAttachment } from "@/components/ui/file-input"

interface QuickCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickCaptureModal({ open, onOpenChange, onSuccess }: QuickCaptureModalProps) {
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [rawText, setRawText] = React.useState("")
  const [attachment, setAttachment] = React.useState<FileAttachment | null>(null)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [step, setStep] = React.useState<"INPUT" | "REVIEW">("INPUT")

  // Extracted structured fields
  const [detectedType, setDetectedType] = React.useState<"ASSIGNMENT" | "QUIZ" | "EXAM" | "PRESENTATION" | "ANNOUNCEMENT">("ASSIGNMENT")
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("")
  const [title, setTitle] = React.useState("")
  const [deadline, setDeadline] = React.useState("")
  const [isAmbiguousDate, setIsAmbiguousDate] = React.useState(false)
  const [topics, setTopics] = React.useState<string[]>([])
  const [source, setSource] = React.useState("WhatsApp")
  const [priority, setPriority] = React.useState<Priority>("MEDIUM")

  React.useEffect(() => {
    if (open) {
      academicService.getSubjects().then((subs) => setSubjects(subs)).catch(console.error)
      setStep("INPUT")
      setRawText("")
      setAttachment(null)
    }
  }, [open])

  const handleAnalyze = async () => {
    if (!rawText.trim()) return
    setIsAnalyzing(true)

    try {
      const subs = subjects.length > 0 ? subjects : await academicService.getSubjects()
      if (subjects.length === 0) setSubjects(subs)

      const parsed = academicService.parseAcademicText(rawText, subs)

      setDetectedType(parsed.type)
      if (parsed.subjectId) {
        setSelectedSubjectId(parsed.subjectId)
      } else if (subs.length > 0) {
        setSelectedSubjectId(subs[0].id)
      }

      setTitle(parsed.title)
      setSource(parsed.source)
      setIsAmbiguousDate(parsed.dateIsAmbiguous)
      setTopics(parsed.topics)

      if (parsed.extractedDate) {
        const d = parsed.extractedDate
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setDeadline(iso)
      } else {
        setDeadline("")
      }

      setStep("REVIEW")
    } catch (err) {
      console.error('Error analyzing text:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!selectedSubjectId || !title.trim()) return

    try {
      if (detectedType === "ASSIGNMENT") {
        await academicService.createAssignment({
          subjectId: selectedSubjectId,
          title: title.trim(),
          description: rawText.trim(),
          originalAnnouncement: rawText.trim(),
          deadline: deadline ? new Date(deadline) : null,
          deadlineConfirmed: !isAmbiguousDate && !!deadline,
          submissionLink: attachment?.fileUrl || undefined,
          priority,
          status: "NOT_STARTED",
          sortOrder: 0,
        })
      } else if (["QUIZ", "EXAM", "PRESENTATION"].includes(detectedType)) {
        await academicService.createEvent({
          subjectId: selectedSubjectId,
          title: title.trim(),
          eventType: detectedType as any,
          date: deadline ? new Date(deadline) : null,
          description: rawText.trim(),
          originalAnnouncement: rawText.trim(),
          priority,
          status: "UPCOMING",
          topics: topics.map((t, idx) => ({ id: `top-${idx}`, topic: t })),
        })
      }

      // Always preserve original announcement
      await academicService.createAnnouncement({
        subjectId: selectedSubjectId,
        title: title.trim(),
        originalMessage: rawText.trim(),
        category: detectedType as any,
        source,
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Failed to save captured item:', err)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span>Universal Academic Quick-Capture</span>
          </DialogTitle>
          <DialogDescription>
            Paste messages from WhatsApp, CR announcements, or class portals. ScholarOS will understand, categorize, and organize them into your academic calendar.
          </DialogDescription>
        </DialogHeader>

        {step === "INPUT" ? (
          <div className="space-y-4 py-2">
            {/* Universal File / URL Attachment */}
            <UnifiedFileInput
              value={attachment}
              onChange={(att) => {
                setAttachment(att)
                if (att) {
                  if (att.extractedText && att.extractedText.length > 15) {
                    setRawText(att.extractedText)
                  } else {
                    setRawText(`Academic announcement regarding ${att.fileName}: ${att.fileUrl || ""}`)
                  }
                  if (att.type === "URL") setSource("Web Portal")
                }
              }}
              label="Attach Announcement Document, Image, or URL"
              description="Upload screenshots, assignment PDFs, or paste portal links to automatically extract deadlines."
            />

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Announcement or Academic Text
              </Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={5}
                placeholder="Example: Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today."
                className="font-sans text-sm focus-visible:ring-primary leading-relaxed"
              />
            </div>

            {/* Quick Template Examples */}
            <div className="bg-gray-50 dark:bg-card p-3 rounded-lg border border-border">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Quick Example Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setRawText(
                      "Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today."
                    )
                  }
                  className="text-xs bg-white dark:bg-gray-800 border border-border px-2.5 py-1 rounded hover:border-primary text-gray-700 dark:text-gray-300 transition-colors"
                >
                  📝 DB Assignment 2 (Nov 5)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRawText(
                      "Operating Systems quiz next Wednesday covering processes, threads, CPU scheduling, and deadlocks."
                    )
                  }
                  className="text-xs bg-white dark:bg-gray-800 border border-border px-2.5 py-1 rounded hover:border-primary text-gray-700 dark:text-gray-300 transition-colors"
                >
                  ⏱️ OS Quiz Announcement
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!rawText.trim() || isAnalyzing}
                className="bg-primary hover:bg-primary-700 text-white gap-2 font-semibold"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze & Extract"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Ambiguity Alert if date was relative */}
            {isAmbiguousDate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Ambiguous relative date detected:</span>
                  The announcement specifies a relative date (e.g. &ldquo;next Wednesday&rdquo;). Please confirm the exact date below before saving.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Subject</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code || "CS"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Category / Event Type</Label>
                <Select value={detectedType} onValueChange={(val: any) => setDetectedType(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                    <SelectItem value="EXAM">Examination</SelectItem>
                    <SelectItem value="PRESENTATION">Presentation</SelectItem>
                    <SelectItem value="ANNOUNCEMENT">General Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Submission Deadline / Event Date</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value)
                    setIsAmbiguousDate(false)
                  }}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="URGENT">Urgent (Upcoming)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {topics.length > 0 && (
              <div>
                <Label className="text-xs font-semibold block mb-1">Identified Preparation Topics</Label>
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Original Announcement Card */}
            <div className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Original Announcement Preserved:
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300 italic whitespace-pre-wrap">
                &ldquo;{rawText}&rdquo;
              </p>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("INPUT")}>
                Back to Edit
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary-700 text-white gap-1.5 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save to Academic Calendar</span>
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
