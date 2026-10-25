"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles,
  Bot,
  PlusCircle,
  ArrowLeft,
  Upload,
  MessageSquare,
  CheckSquare,
  AlertCircle,
  FolderOpen,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { academicService } from "@/lib/academic-service"
import { Subject, Assignment, AcademicEvent, Announcement, Resource, StudyNote } from "@/types"
import { formatDate, formatRelativeDate, getPriorityColor, getStatusColor } from "@/lib/utils"

export default function SubjectWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params?.id as string

  const [subject, setSubject] = React.useState<Subject | null>(null)
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  const [events, setEvents] = React.useState<AcademicEvent[]>([])
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [resources, setResources] = React.useState<Resource[]>([])
  const [studyNotes, setStudyNotes] = React.useState<StudyNote[]>([])
  const [activeTab, setActiveTab] = React.useState("overview")

  const loadData = React.useCallback(() => {
    if (!subjectId) return
    const sub = academicService.getSubjectById(subjectId)
    if (!sub) {
      router.push("/subjects")
      return
    }
    setSubject(sub)
    setAssignments(academicService.getAssignments().filter((a) => a.subjectId === subjectId))
    setEvents(academicService.getEvents().filter((e) => e.subjectId === subjectId))
    setAnnouncements(academicService.getAnnouncements().filter((a) => a.subjectId === subjectId))
    setResources(academicService.getResources().filter((r) => r.subjectId === subjectId))
    setStudyNotes(academicService.getStudyNotes().filter((n) => n.subjectId === subjectId))
  }, [subjectId, router])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  if (!subject) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading course workspace...</div>
  }

  const pendingAssignments = assignments.filter((a) => !['COMPLETED', 'SUBMITTED', 'CANCELLED'].includes(a.status))
  const upcomingEvents = events.filter((e) => e.status === 'UPCOMING')

  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/subjects" className="hover:text-primary flex items-center gap-1 font-medium">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Subjects</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{subject.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-white dark:bg-card shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: subject.color || "#1E3A5F" }}
              />
              <Badge variant="outline" className="font-semibold text-xs">
                {subject.code || "Course Workspace"}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">• {subject.semester || "Semester"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              {subject.name}
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl">
              {subject.description || "Course materials, deadlines, lecture notes, and revision resources."}
            </p>
            {subject.instructor && (
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Instructor: <span className="font-bold text-gray-900 dark:text-gray-100">{subject.instructor}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/assistant?subject=${encodeURIComponent(subject.name)}`}>
              <Button size="sm" className="bg-primary hover:bg-primary-700 text-white gap-2 font-semibold shadow-sm">
                <Bot className="h-4 w-4" />
                <span>Ask AI About {subject.name}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100 dark:bg-card p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs font-semibold py-2 px-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs font-semibold py-2 px-3">
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="text-xs font-semibold py-2 px-3">
            Quizzes & Exams ({events.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-xs font-semibold py-2 px-3">
            Lecture Slides ({resources.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs font-semibold py-2 px-3">
            AI Study Notes ({studyNotes.length})
          </TabsTrigger>
          <TabsTrigger value="announcements" className="text-xs font-semibold py-2 px-3">
            Announcements ({announcements.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Pending Assignments */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Pending Assignments</span>
                  <Badge variant="secondary">{pendingAssignments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No pending assignments</p>
                ) : (
                  pendingAssignments.map((asg) => (
                    <div key={asg.id} className="p-2.5 rounded-lg border border-border text-xs">
                      <span className="font-semibold block truncate text-gray-900 dark:text-gray-100">{asg.title}</span>
                      <span className="text-primary font-medium mt-1 block">Due: {formatRelativeDate(asg.deadline)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Quizzes */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Upcoming Quizzes & Exams</span>
                  <Badge variant="secondary">{upcomingEvents.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No upcoming events</p>
                ) : (
                  upcomingEvents.map((evt) => (
                    <div key={evt.id} className="p-2.5 rounded-lg border border-border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate text-gray-900 dark:text-gray-100">{evt.title}</span>
                        <Badge variant="outline" className="text-[10px]">{evt.eventType}</Badge>
                      </div>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{formatRelativeDate(evt.date)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Study Guides & Notes */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>AI Study Notes</span>
                  <Badge variant="secondary">{studyNotes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {studyNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No notes generated yet</p>
                ) : (
                  studyNotes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded-lg border border-border text-xs">
                      <span className="font-semibold block truncate text-gray-900 dark:text-gray-100">{note.title}</span>
                      <span className="text-muted-foreground text-[10px] block mt-0.5">Format: {note.noteType}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subject Overview Documents */}
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Uploaded Course Documents & Slides</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resources.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No lecture slides uploaded yet. You can upload PDFs or PowerPoints in the materials tab.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {resources.map((res) => (
                    <div key={res.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          PDF
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">{res.title}</h4>
                          <span className="text-[11px] text-muted-foreground">
                            {res.fileName} • {res.extractedTexts?.length || 0} indexed passages
                          </span>
                        </div>
                      </div>
                      <Link href={`/assistant?prep=${encodeURIComponent(res.title)}`}>
                        <Button size="sm" variant="outline" className="text-xs font-semibold gap-1">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span>Generate Notes</span>
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ASSIGNMENTS TAB */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Course Assignments</h3>
            <Link href="/assignments">
              <Button size="sm" className="bg-primary text-white text-xs gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Assignment</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center border rounded-xl">
                No assignments recorded for this subject yet.
              </p>
            ) : (
              assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="p-4 rounded-xl border border-border bg-white dark:bg-card shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{asg.title}</h4>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {asg.priority}
                      </Badge>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(asg.status)}`}>
                        {asg.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">{asg.description}</p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Due: {formatDate(asg.deadline)} ({formatRelativeDate(asg.deadline)})
                      </span>
                      {asg.submissionMethod && <span>• Submission: {asg.submissionMethod}</span>}
                    </div>

                    {asg.originalAnnouncement && (
                      <div className="mt-2.5 p-2.5 rounded bg-gray-50 dark:bg-card border border-border text-[11px] text-muted-foreground italic">
                        &ldquo;{asg.originalAnnouncement}&rdquo;
                      </div>
                    )}
                  </div>

                  <Link href={`/assistant?prep=${encodeURIComponent(asg.title)}`}>
                    <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>AI Help</span>
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* 3. QUIZZES & EXAMS TAB */}
        <TabsContent value="quizzes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Quizzes, Midterms & Finals</h3>
            <Link href="/events">
              <Button size="sm" className="bg-primary text-white text-xs gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Event</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center border rounded-xl">
                No events scheduled for this subject.
              </p>
            ) : (
              events.map((evt) => (
                <div key={evt.id} className="p-4 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                          {evt.eventType}
                        </Badge>
                        <span className="text-xs font-semibold text-primary">{formatRelativeDate(evt.date)}</span>
                      </div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{evt.title}</h4>
                      <p className="text-xs text-muted-foreground">{evt.description}</p>
                    </div>

                    <Link href={`/assistant?prep=${encodeURIComponent(evt.title)}`}>
                      <Button size="sm" className="bg-primary text-white text-xs gap-1.5 font-semibold">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>Interactive Quiz Mode</span>
                      </Button>
                    </Link>
                  </div>

                  {evt.topics && evt.topics.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Topics To Prepare:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {evt.topics.map((t) => (
                          <Badge key={t.id} variant="secondary" className="text-xs">
                            {t.topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* 4. LECTURE SLIDES TAB */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Lecture Slides & PDFs</h3>
            <Link href="/materials">
              <Button size="sm" className="bg-primary text-white text-xs gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload New Material</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {resources.map((res) => (
              <div key={res.id} className="p-4 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{res.title}</h4>
                    <p className="text-xs text-muted-foreground">{res.description}</p>
                  </div>
                  <Link href={`/assistant?prep=${encodeURIComponent(res.title)}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 font-semibold">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Deep Analysis</span>
                    </Button>
                  </Link>
                </div>

                {res.extractedTexts && res.extractedTexts.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg text-xs space-y-1.5">
                    <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">
                      Sample Extracted Slides Text ({res.extractedTexts.length} slides indexed):
                    </span>
                    {res.extractedTexts.slice(0, 2).map((et) => (
                      <p key={et.id} className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                        [Slide {et.slideNumber}]: {et.content}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 5. AI STUDY NOTES TAB */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Generated Study Guides & Explanations</h3>
            <Link href={`/assistant?prep=${encodeURIComponent(subject.name)}`}>
              <Button size="sm" className="bg-primary text-white text-xs gap-1.5 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Generate New Notes</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {studyNotes.map((note) => (
              <div key={note.id} className="p-5 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{note.title}</h4>
                    <span className="text-[11px] text-muted-foreground">Version {note.version} • Grounded in Lecture Slides</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">{note.noteType}</Badge>
                </div>
                <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200">
                  {note.content}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 6. ANNOUNCEMENTS TAB */}
        <TabsContent value="announcements" className="space-y-3">
          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Announcements Received</h3>
          {announcements.map((ann) => (
            <div key={ann.id} className="p-4 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-primary">{ann.source || "CR"}</span>
                <span className="text-[11px] text-muted-foreground">{formatRelativeDate(ann.dateReceived)}</span>
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-200 italic">&ldquo;{ann.originalMessage}&rdquo;</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
