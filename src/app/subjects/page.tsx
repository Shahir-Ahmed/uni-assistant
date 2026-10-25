"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  FileText,
  Clock,
  Trash2,
  Archive,
  RefreshCw,
  Edit,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { Subject } from "@/types"

const PRESET_COLORS = [
  "#1E3A5F", // Deep Navy
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#64748B", // Slate
]

export default function SubjectsPage() {
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterArchived, setFilterArchived] = React.useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null)

  // Form fields
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [semester, setSemester] = React.useState("Fall 2026")
  const [academicYear, setAcademicYear] = React.useState("2026-2027")
  const [instructor, setInstructor] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [color, setColor] = React.useState(PRESET_COLORS[0])

  const loadSubjects = React.useCallback(() => {
    setSubjects(academicService.getSubjects())
  }, [])

  React.useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  const handleOpenCreate = () => {
    setEditingSubject(null)
    setName("")
    setCode("")
    setSemester("Fall 2026")
    setAcademicYear("2026-2027")
    setInstructor("")
    setDescription("")
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    setDialogOpen(true)
  }

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setName(subject.name)
    setCode(subject.code || "")
    setSemester(subject.semester || "Fall 2026")
    setAcademicYear(subject.academicYear || "2026-2027")
    setInstructor(subject.instructor || "")
    setDescription(subject.description || "")
    setColor(subject.color || PRESET_COLORS[0])
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!name.trim()) return

    if (editingSubject) {
      academicService.updateSubject(editingSubject.id, {
        name: name.trim(),
        code: code.trim() || null,
        semester: semester.trim() || null,
        academicYear: academicYear.trim() || null,
        instructor: instructor.trim() || null,
        description: description.trim() || null,
        color,
      })
    } else {
      academicService.createSubject({
        name: name.trim(),
        code: code.trim() || null,
        semester: semester.trim() || null,
        academicYear: academicYear.trim() || null,
        instructor: instructor.trim() || null,
        description: description.trim() || null,
        color,
      })
    }

    setDialogOpen(false)
    loadSubjects()
  }

  const handleToggleArchive = (subject: Subject) => {
    academicService.updateSubject(subject.id, { isArchived: !subject.isArchived })
    loadSubjects()
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this subject?")) {
      academicService.deleteSubject(id)
      loadSubjects()
    }
  }

  const filtered = subjects
    .filter((s) => (filterArchived ? s.isArchived : !s.isArchived))
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.instructor?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>My Subjects</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize lectures, assignments, and study materials by course workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterArchived(!filterArchived)}
            className="text-xs font-medium"
          >
            {filterArchived ? "Show Active Subjects" : "Show Archived"}
          </Button>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="bg-primary hover:bg-primary-700 text-white gap-1.5 font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Subject</span>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects or instructors..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-gray-50/50 dark:bg-card/50">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">No subjects found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No subjects matched your query."
              : "Get started by adding your courses for this semester."}
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4 bg-primary text-white text-xs">
            Create First Subject
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((subject) => (
            <div
              key={subject.id}
              className="rounded-xl border border-border bg-white dark:bg-card shadow-sm hover:shadow-card-hover transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header Colored Banner */}
              <div
                className="h-2.5 w-full"
                style={{ backgroundColor: subject.color || "#1E3A5F" }}
              />

              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {subject.code || "CS Course"}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(subject)} className="text-xs gap-2">
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleArchive(subject)} className="text-xs gap-2">
                        <Archive className="h-3.5 w-3.5" />
                        <span>{subject.isArchived ? "Restore Subject" : "Archive Subject"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(subject.id)}
                        className="text-xs gap-2 text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Subject</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Link href={`/subjects/${subject.id}`} className="block group-hover:text-primary transition-colors">
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{subject.name}</h3>
                </Link>

                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5rem]">
                  {subject.description || "Comprehensive course workspace for notes, slides, and tasks."}
                </p>

                {subject.instructor && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-3">
                    Instructor: <span className="text-gray-800 dark:text-gray-200">{subject.instructor}</span>
                  </p>
                )}
              </div>

              {/* Card Footer with quick link */}
              <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-card/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {subject.semester || "Semester"}
                </span>
                <Link
                  href={`/subjects/${subject.id}`}
                  className="text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Open Workspace</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? "Edit Subject" : "Create New Subject"}</DialogTitle>
            <DialogDescription>
              Set up a course workspace for assignments, lecture slides, and AI study notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Subject Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Database Systems"
                className="mt-1 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Course Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS-301"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Semester</Label>
                <Input
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. Fall 2026"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Instructor Name (Optional)</Label>
              <Input
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g. Dr. Tariq Mahmood"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Scope (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of syllabus or topics covered..."
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold block mb-1.5">Color Theme</Label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#000" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim()}
              className="bg-primary hover:bg-primary-700 text-white font-semibold"
            >
              {editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
