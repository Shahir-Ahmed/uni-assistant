"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  Sparkles,
  History,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  BookOpen,
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
import { Assignment, Subject, AssignmentStatus, Priority } from "@/types"
import { formatDate, formatDateTime, formatRelativeDate, getPriorityColor, getStatusColor, isOverdue } from "@/lib/utils"

export default function AssignmentsPage() {
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterSubject, setFilterSubject] = React.useState<string>("ALL")
  const [activeTab, setActiveTab] = React.useState<string>("PENDING")
  const [sortBy, setSortBy] = React.useState<"DEADLINE" | "PRIORITY" | "CREATED">("DEADLINE")

  // Modal State
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingAssignment, setEditingAssignment] = React.useState<Assignment | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false)
  const [selectedForHistory, setSelectedForHistory] = React.useState<Assignment | null>(null)

  // Form State
  const [title, setTitle] = React.useState("")
  const [subjectId, setSubjectId] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [instructions, setInstructions] = React.useState("")
  const [deadline, setDeadline] = React.useState("")
  const [priority, setPriority] = React.useState<Priority>("MEDIUM")
  const [status, setStatus] = React.useState<AssignmentStatus>("NOT_STARTED")
  const [submissionMethod, setSubmissionMethod] = React.useState("")
  const [submissionLink, setSubmissionLink] = React.useState("")
  const [estimatedEffort, setEstimatedEffort] = React.useState("")
  const [personalNotes, setPersonalNotes] = React.useState("")
  const [changeReason, setChangeReason] = React.useState("")

  const loadData = React.useCallback(() => {
    setAssignments(academicService.getAssignments())
    setSubjects(academicService.getSubjects())
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    setEditingAssignment(null)
    setTitle("")
    setSubjectId(subjects.length > 0 ? subjects[0].id : "")
    setDescription("")
    setInstructions("")
    setDeadline("")
    setPriority("MEDIUM")
    setStatus("NOT_STARTED")
    setSubmissionMethod("University Portal")
    setSubmissionLink("")
    setEstimatedEffort("4-6 hours")
    setPersonalNotes("")
    setChangeReason("")
    setDialogOpen(true)
  }

  const handleOpenEdit = (asg: Assignment) => {
    setEditingAssignment(asg)
    setTitle(asg.title)
    setSubjectId(asg.subjectId)
    setDescription(asg.description || "")
    setInstructions(asg.instructions || "")
    if (asg.deadline) {
      const d = new Date(asg.deadline)
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setDeadline(iso)
    } else {
      setDeadline("")
    }
    setPriority(asg.priority)
    setStatus(asg.status)
    setSubmissionMethod(asg.submissionMethod || "")
    setSubmissionLink(asg.submissionLink || "")
    setEstimatedEffort(asg.estimatedEffort || "")
    setPersonalNotes(asg.personalNotes || "")
    setChangeReason("")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!title.trim() || !subjectId) return

    if (editingAssignment) {
      academicService.updateAssignment(
        editingAssignment.id,
        {
          title: title.trim(),
          subjectId,
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          deadline: deadline ? new Date(deadline) : null,
          deadlineConfirmed: true,
          priority,
          status,
          submissionMethod: submissionMethod.trim() || null,
          submissionLink: submissionLink.trim() || null,
          estimatedEffort: estimatedEffort.trim() || null,
          personalNotes: personalNotes.trim() || null,
        },
        changeReason || 'Updated from assignment manager'
      )
    } else {
      academicService.createAssignment({
        title: title.trim(),
        subjectId,
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        deadlineConfirmed: true,
        priority,
        status,
        submissionMethod: submissionMethod.trim() || null,
        submissionLink: submissionLink.trim() || null,
        estimatedEffort: estimatedEffort.trim() || null,
        personalNotes: personalNotes.trim() || null,
        sortOrder: 0,
      })
    }

    setDialogOpen(false)
    loadData()
  }

  const handleToggleStatus = (asg: Assignment) => {
    const nextStatus: AssignmentStatus = asg.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
    academicService.updateAssignment(asg.id, { status: nextStatus }, 'Quick toggled status')
    loadData()
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this assignment record? This will remove its scheduled reminders.")) {
      academicService.deleteAssignment(id)
      loadData()
    }
  }

  // Filter & Sort Logic
  const filtered = assignments.filter((a) => {
    // Subject filter
    if (filterSubject !== "ALL" && a.subjectId !== filterSubject) return false

    // Search query
    if (
      searchQuery &&
      !a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !a.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    const overdue = isOverdue(a.deadline, a.status)

    // Tab view filter
    switch (activeTab) {
      case "PENDING":
        return !['COMPLETED', 'SUBMITTED', 'CANCELLED'].includes(a.status)
      case "OVERDUE":
        return overdue
      case "TODAY": {
        if (!a.deadline) return false
        const d = new Date(a.deadline)
        const today = new Date()
        return d.toDateString() === today.toDateString()
      }
      case "WEEK": {
        if (!a.deadline) return false
        const d = new Date(a.deadline)
        const now = new Date()
        const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return d >= now && d <= weekAhead
      }
      case "COMPLETED":
        return ['COMPLETED', 'SUBMITTED'].includes(a.status)
      case "ALL":
      default:
        return true
    }
  })

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === "DEADLINE") {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (sortBy === "PRIORITY") {
      const order = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return (order[b.priority] || 0) - (order[a.priority] || 0)
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            <span>Assignments & Deadlines</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track submissions, view deadline histories, and prepare solutions
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="bg-primary hover:bg-primary-700 text-white gap-1.5 font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Assignment</span>
        </Button>
      </div>

      {/* View Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        {[
          { key: "PENDING", label: "Active Pending" },
          { key: "OVERDUE", label: "Overdue", alert: assignments.filter((a) => isOverdue(a.deadline, a.status)).length > 0 },
          { key: "TODAY", label: "Due Today" },
          { key: "WEEK", label: "Due This Week" },
          { key: "COMPLETED", label: "Submitted & Done" },
          { key: "ALL", label: "All Records" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-card hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {tab.label}
            {tab.alert && <span className="ml-1.5 h-2 w-2 rounded-full bg-red-500 inline-block animate-pulse"></span>}
          </button>
        ))}
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter assignments..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" />
            Sort:
          </span>
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEADLINE">Nearest Deadline</SelectItem>
              <SelectItem value="PRIORITY">Urgency / Priority</SelectItem>
              <SelectItem value="CREATED">Recently Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignment Cards List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-gray-50/50 dark:bg-card/50">
          <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">No assignments found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No assignments match the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((asg) => {
            const overdue = isOverdue(asg.deadline, asg.status)

            return (
              <div
                key={asg.id}
                id={asg.id}
                className={`p-4 sm:p-5 rounded-xl border bg-white dark:bg-card shadow-sm hover:shadow-card-hover transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  overdue ? "border-red-300 dark:border-red-900/60 bg-red-50/10" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(asg)}
                    className="mt-1 text-gray-400 hover:text-green-600 transition-colors shrink-0"
                  >
                    {asg.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 fill-green-50" />
                    ) : (
                      <div className="h-5 w-5 rounded-md border-2 border-gray-400 hover:border-green-600" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-bold text-base text-gray-900 dark:text-gray-100 ${
                          asg.status === "COMPLETED" ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {asg.title}
                      </h3>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(
                          asg.priority
                        )}`}
                      >
                        {asg.priority}
                      </span>

                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${getStatusColor(asg.status)}`}>
                        {asg.status.replace(/_/g, " ")}
                      </span>

                      {overdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{asg.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {asg.subject?.name || "Subject"}
                      </span>
                      <span>•</span>
                      <span className={`font-semibold flex items-center gap-1 ${overdue ? "text-red-600 font-bold" : "text-primary"}`}>
                        <Clock className="h-3.5 w-3.5" />
                        Deadline: {formatDateTime(asg.deadline)} ({formatRelativeDate(asg.deadline)})
                      </span>
                      {asg.estimatedEffort && <span>• Est. Effort: {asg.estimatedEffort}</span>}
                    </div>

                    {asg.originalAnnouncement && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-card border border-border rounded text-[11px] text-muted-foreground italic">
                        Preserved Announcement: &ldquo;{asg.originalAnnouncement}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link href={`/assistant?prep=${encodeURIComponent(asg.title)}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>AI Prep</span>
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedForHistory(asg)
                      setHistoryModalOpen(true)
                    }}
                    title="Deadline Change History"
                    className="h-8 w-8 p-0"
                  >
                    <History className="h-4 w-4 text-muted-foreground" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(asg)}
                    title="Edit Assignment"
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(asg.id)}
                    title="Delete"
                    className="h-8 w-8 p-0 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Assignment & Deadline" : "Create New Assignment"}</DialogTitle>
            <DialogDescription>
              Deadlines are automatically tracked, scheduled for reminders, and synced to your academic calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Assignment Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Assignment 2: ER Diagram and Relational Schema"
                className="mt-1 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Subject *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select Subject" />
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
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Submission Deadline</Label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="READY_TO_SUBMIT">Ready to Submit</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingAssignment && (
              <div>
                <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Reason for Change (Tracked in Audit History)
                </Label>
                <Input
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. CR announced extension until Monday 11:59 PM"
                  className="mt-1 text-xs"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Description / Requirements</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Overview of questions or tasks..."
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Submission Method</Label>
                <Input
                  value={submissionMethod}
                  onChange={(e) => setSubmissionMethod(e.target.value)}
                  placeholder="e.g. LMS Portal, GitHub"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Estimated Effort</Label>
                <Input
                  value={estimatedEffort}
                  onChange={(e) => setEstimatedEffort(e.target.value)}
                  placeholder="e.g. 6 hours"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Personal Notes</Label>
              <Textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Reminders to self, references to review..."
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
              {editingAssignment ? "Update Assignment" : "Create Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deadline Change History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>Assignment History Log</span>
            </DialogTitle>
            <DialogDescription>
              Audit trail of deadline changes, status modifications, and announcements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {selectedForHistory?.history && selectedForHistory.history.length > 0 ? (
              selectedForHistory.history.map((h) => (
                <div key={h.id} className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {h.field}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(h.changedAt)}</span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 font-medium">
                    {h.oldValue ? `Changed from: "${h.oldValue}"` : "Initial value"}{" "}
                    &rarr; <span className="text-primary font-bold">"{h.newValue}"</span>
                  </p>
                  {h.reason && <p className="text-[11px] text-muted-foreground italic">Reason: {h.reason}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No modification history recorded.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
