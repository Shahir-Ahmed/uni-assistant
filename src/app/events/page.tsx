"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Sparkles,
  Clock,
  MapPin,
  BookOpen,
  CheckCircle2,
  Trash2,
  Edit,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { AcademicEvent, Subject, EventType, Priority } from "@/types"
import { formatDate, formatDateTime, formatRelativeDate, getPriorityColor } from "@/lib/utils"

export default function EventsPage() {
  const [events, setEvents] = React.useState<AcademicEvent[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Form Fields
  const [title, setTitle] = React.useState("")
  const [subjectId, setSubjectId] = React.useState("")
  const [eventType, setEventType] = React.useState<EventType>("QUIZ")
  const [date, setDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("10:00 AM")
  const [endTime, setEndTime] = React.useState("11:00 AM")
  const [location, setLocation] = React.useState("Room 204")
  const [description, setDescription] = React.useState("")
  const [topicsInput, setTopicsInput] = React.useState("")
  const [priority, setPriority] = React.useState<Priority>("HIGH")

  const loadData = React.useCallback(() => {
    setEvents(academicService.getEvents())
    setSubjects(academicService.getSubjects())
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    setTitle("")
    setSubjectId(subjects.length > 0 ? subjects[0].id : "")
    setEventType("QUIZ")
    setDate("")
    setStartTime("10:00 AM")
    setEndTime("11:00 AM")
    setLocation("Room 204")
    setDescription("")
    setTopicsInput("Topic 1, Topic 2, Topic 3")
    setPriority("HIGH")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!title.trim() || !subjectId) return

    const topicList = topicsInput
      .split(/,|\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t, idx) => ({ id: `top-${Date.now()}-${idx}`, topic: t }))

    academicService.createEvent({
      title: title.trim(),
      subjectId,
      eventType,
      date: date ? new Date(date) : null,
      startTime,
      endTime,
      location,
      description: description.trim() || null,
      priority,
      status: "UPCOMING",
      topics: topicList,
    })

    setDialogOpen(false)
    loadData()
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-amber-500" />
            <span>Quizzes, Exams & Presentations</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize academic assessments and launch interactive AI preparation sessions
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="bg-primary hover:bg-primary-700 text-white gap-1.5 font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Assessment</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-5 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-4 hover:shadow-card-hover transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-bold">
                    {evt.eventType}
                  </Badge>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(evt.priority)}`}>
                    {evt.priority}
                  </span>
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{evt.title}</h3>
                <span className="text-xs font-semibold text-primary">{evt.subject?.name || "Subject"}</span>
              </div>

              <Link href={`/assistant?prep=${encodeURIComponent(evt.title)}`}>
                <Button size="sm" className="bg-primary text-white text-xs gap-1.5 font-semibold shrink-0 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Start AI Prep</span>
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{evt.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
              <span className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                <CalendarIcon className="h-3.5 w-3.5 text-amber-500" />
                {formatDate(evt.date)} ({formatRelativeDate(evt.date)})
              </span>
              {evt.startTime && <span>• {evt.startTime} - {evt.endTime}</span>}
              {evt.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {evt.location}
                </span>
              )}
            </div>

            {/* Preparation Topics */}
            {evt.topics && evt.topics.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Syllabus / Topics To Master:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evt.topics.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs font-medium">
                      {t.topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assessment Creation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Academic Assessment</DialogTitle>
            <DialogDescription>
              Record quizzes, midterms, presentations, or lab exams. AI will tailor revision sessions to your syllabus topics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems Quiz 2"
                className="mt-1 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Subject *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Assessment Type</Label>
                <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                    <SelectItem value="MIDTERM">Midterm Exam</SelectItem>
                    <SelectItem value="FINAL_EXAM">Final Exam</SelectItem>
                    <SelectItem value="PRESENTATION">Presentation</SelectItem>
                    <SelectItem value="LAB_SUBMISSION">Lab Exam</SelectItem>
                    <SelectItem value="VIVA">Viva / Oral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Location / Room</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lab 4 / Auditorium"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Covered Syllabus / Topics (Comma separated)</Label>
              <Textarea
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="e.g. Processes, Threads, CPU Scheduling, Deadlocks"
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || !subjectId}
              className="bg-primary hover:bg-primary-700 text-white font-semibold"
            >
              Save Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
