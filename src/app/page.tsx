"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Bot,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  CheckSquare,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { Subject, Assignment, AcademicEvent, Announcement, Resource } from "@/types"
import { formatDate, formatRelativeDate, getPriorityColor, getStatusColor, isOverdue } from "@/lib/utils"
import { QuickCaptureModal } from "@/components/capture/QuickCaptureModal"

export default function DashboardPage() {
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  const [events, setEvents] = React.useState<AcademicEvent[]>([])
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [resources, setResources] = React.useState<Resource[]>([])
  const [captureOpen, setCaptureOpen] = React.useState(false)

  const loadData = React.useCallback(() => {
    setSubjects(academicService.getSubjects())
    setAssignments(academicService.getAssignments())
    setEvents(academicService.getEvents())
    setAnnouncements(academicService.getAnnouncements())
    setResources(academicService.getResources())
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Computed metrics for dashboard
  const activeAssignments = assignments.filter((a) => !['COMPLETED', 'SUBMITTED', 'CANCELLED'].includes(a.status))
  const overdueAssignments = assignments.filter((a) => isOverdue(a.deadline, a.status))
  const upcomingAssignments = activeAssignments
    .filter((a) => a.deadline && !isOverdue(a.deadline, a.status))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)

  const upcomingQuizzesAndExams = events
    .filter((e) => e.status === 'UPCOMING' && e.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 3)

  const handleToggleComplete = (assignment: Assignment) => {
    const nextStatus = assignment.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
    academicService.updateAssignment(assignment.id, { status: nextStatus }, 'Toggled from Dashboard')
    loadData()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Welcome Section & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 text-white p-6 rounded-2xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Fall Semester 2026
            </span>
            <span className="text-xs text-white/70">Welcome back</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Academic Command Center</h1>
          <p className="text-sm text-white/80 max-w-xl">
            You have <span className="font-semibold text-white">{activeAssignments.length} pending assignments</span> and{" "}
            <span className="font-semibold text-amber-300">{upcomingQuizzesAndExams.length} upcoming quizzes/exams</span> scheduled.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setCaptureOpen(true)}
            className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm h-10 px-4 rounded-xl gap-2"
          >
            <PlusCircle className="h-4 w-4 text-primary" />
            <span>Quick Capture</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => (window.location.href = "/assistant")}
            className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-medium h-10 px-4 rounded-xl gap-2"
          >
            <Bot className="h-4 w-4" />
            <span>Ask AI Assistant</span>
          </Button>
        </div>
      </div>

      {/* 2. Overdue Alert Banner (if any) */}
      {overdueAssignments.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between gap-4 text-sm text-red-800 dark:text-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Attention:</span> You have {overdueAssignments.length} overdue assignment
              {overdueAssignments.length > 1 ? "s" : ""} requiring immediate submission or catch-up planning!
            </div>
          </div>
          <Link href="/assignments?filter=overdue">
            <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold shrink-0">
              Review Overdue
            </Button>
          </Link>
        </div>
      )}

      {/* 3. Grid: Upcoming Deadlines & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approaching Deadlines */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Clock className="h-4 w-4 text-primary" />
                <span>Approaching Deadlines</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Tasks due in the next few days</p>
            </div>
            <Link href="/assignments">
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 text-primary">
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No upcoming deadlines! Relax or capture new assignments.
              </div>
            ) : (
              upcomingAssignments.map((asg) => (
                <div
                  key={asg.id}
                  className="p-3.5 rounded-xl border border-border bg-gray-50/50 dark:bg-card/50 hover:border-primary/40 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(asg)}
                      className="mt-0.5 text-gray-400 hover:text-green-600 transition-colors shrink-0"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/assignments#${asg.id}`}
                          className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-primary truncate block"
                        >
                          {asg.title}
                        </Link>
                        {asg.priority && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(
                              asg.priority
                            )}`}
                          >
                            {asg.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {asg.subject?.name || "General"}
                        </span>
                        <span>•</span>
                        <span className="text-primary font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(asg.deadline)} ({formatDate(asg.deadline)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${getStatusColor(asg.status)}`}>
                      {asg.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Next Quizzes & Exams */}
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span>Upcoming Quizzes & Exams</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Prepare with AI study guides</p>
            </div>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 text-primary">
                <span>View</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingQuizzesAndExams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No upcoming exams or quizzes scheduled.
              </div>
            ) : (
              upcomingQuizzesAndExams.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl border border-border bg-gray-50/50 dark:bg-card/50 hover:border-amber-400/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-700 bg-amber-50">
                      {evt.eventType}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatRelativeDate(evt.date)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{evt.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {evt.subject?.name || "Subject"} • {evt.location || "On Campus"}
                  </p>

                  {/* AI Prep Link */}
                  <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
                    <Link
                      href={`/assistant?prep=${encodeURIComponent(evt.title)}`}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Prepare with AI</span>
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {evt.topics?.length || 0} topics
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Active Subjects List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Enrolled Subjects ({subjects.length})</span>
            </h2>
            <p className="text-xs text-muted-foreground">Access individual subject workspaces and study notes</p>
          </div>
          <Link href="/subjects">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
              <span>Manage Subjects</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map((sub) => {
            const subAssignments = assignments.filter((a) => a.subjectId === sub.id && a.status !== 'COMPLETED')
            const subResources = resources.filter((r) => r.subjectId === sub.id)

            return (
              <Link
                key={sub.id}
                href={`/subjects/${sub.id}`}
                className="p-4 rounded-xl border border-border bg-white dark:bg-card hover:shadow-card-hover transition-all hover:-translate-y-0.5 group block"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: sub.color || "#1E3A5F" }}
                  />
                  <span className="text-[11px] font-bold text-muted-foreground">{sub.code || "CS"}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
                  {sub.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
                  {sub.description || "Course materials, assignments, and study guides."}
                </p>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{subAssignments.length} pending</span>
                  <span>{subResources.length} files</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 5. Recent Announcements & Uploaded Files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Captured Announcements</span>
            </CardTitle>
            <Link href="/inbox">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-3 rounded-lg border border-border bg-gray-50/50 dark:bg-card/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-primary">{ann.source || "CR"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeDate(ann.dateReceived)}</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 italic line-clamp-2">
                  &ldquo;{ann.originalMessage}&rdquo;
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recently Added Files */}
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Recent Study Materials</span>
            </CardTitle>
            <Link href="/materials">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary">
                Library
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.slice(0, 3).map((res) => (
              <div key={res.id} className="p-3 rounded-lg border border-border bg-gray-50/50 dark:bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{res.title}</h4>
                    <span className="text-[11px] text-muted-foreground">
                      {res.subject?.name || "Subject"} • {res.resourceType}
                    </span>
                  </div>
                </div>
                <Link href="/materials">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Capture Modal Instance */}
      <QuickCaptureModal
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onSuccess={() => loadData()}
      />
    </div>
  )
}
