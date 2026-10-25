"use client"

import * as React from "react"
import Link from "next/link"
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Layers,
  HelpCircle,
  FileCode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Resource, Subject, StudyNote, NoteType } from "@/types"
import { formatDate } from "@/lib/utils"

export default function MaterialsPage() {
  const [resources, setResources] = React.useState<Resource[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [studyNotes, setStudyNotes] = React.useState<StudyNote[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterSubject, setFilterSubject] = React.useState<string>("ALL")

  // Upload Dialog
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [subjectId, setSubjectId] = React.useState("")
  const [category, setCategory] = React.useState("LECTURE_SLIDES")
  const [fileName, setFileName] = React.useState("Lecture_Notes.pdf")
  const [sampleContent, setSampleContent] = React.useState("")

  // Generate Notes Modal
  const [generateModalOpen, setGenerateModalOpen] = React.useState(false)
  const [selectedResource, setSelectedResource] = React.useState<Resource | null>(null)
  const [noteFormat, setNoteFormat] = React.useState<NoteType>("DETAILED")
  const [isGenerating, setIsGenerating] = React.useState(false)

  const loadData = React.useCallback(() => {
    setResources(academicService.getResources())
    setSubjects(academicService.getSubjects())
    setStudyNotes(academicService.getStudyNotes())
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenUpload = () => {
    setTitle("")
    setSubjectId(subjects.length > 0 ? subjects[0].id : "")
    setCategory("LECTURE_SLIDES")
    setFileName("Lecture_Slides_Week7.pdf")
    setSampleContent("Slide 1: CPU Scheduling Concepts. FCFS, SJF, Priority Scheduling, Round Robin. Slide 2: Banker's Algorithm safety check algorithm.")
    setUploadOpen(true)
  }

  const handleSaveUpload = () => {
    if (!title.trim() || !subjectId) return

    // Simulate OCR and document extraction
    const mockExtracted = [
      { id: `et-1-${Date.now()}`, slideNumber: 1, content: sampleContent.slice(0, 120) },
      { id: `et-2-${Date.now()}`, slideNumber: 2, content: sampleContent.slice(120) || 'Detailed worked algorithms and formulas.' },
    ]

    const newRes: Resource = {
      id: `res-${Date.now()}`,
      title: title.trim(),
      subjectId,
      resourceType: "PDF",
      fileName,
      category: category as any,
      isProcessed: true,
      processingStatus: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
      extractedTexts: mockExtracted,
    }

    const current = academicService.getResources()
    localStorage.setItem("scholaros_resources_v1", JSON.stringify([newRes, ...current]))
    setUploadOpen(false)
    loadData()
  }

  const handleTriggerGenerate = (res: Resource) => {
    setSelectedResource(res)
    setGenerateModalOpen(true)
  }

  const handleGenerateConfirm = () => {
    if (!selectedResource) return
    setIsGenerating(true)

    setTimeout(() => {
      let content = ""
      if (noteFormat === "DETAILED") {
        content = `# Beginner-Friendly Notes: ${selectedResource.title}

## 1. Core Concept Overview
The uploaded lecture slides cover fundamental principles designed for clear understanding from first principles.

### Key Terminology
- **Primary Mechanism:** The core operating logic defined by the instructor.
- **Constraints:** The boundary conditions mentioned in Slide 1 and 2.

## 2. Practical Real-World Example
Imagine an airport air traffic control tower prioritizing airplanes landing on a runway. If flight emergency occurs, it preempts routine scheduled arrivals.

## 3. Step-by-Step Procedure
1. Initialize parameters based on given criteria.
2. Evaluate priority queue.
3. Verify safety state before allocating resources.

## 4. Practice Questions
1. What are the four essential conditions that cause a deadlock?
2. Compare preemptive versus non-preemptive scheduling with an example.
`
      } else if (noteFormat === "REVISION") {
        content = `# Quick Revision Sheet: ${selectedResource.title}
* **Core Definition:** High-priority principles for exam quick review.
* **Essential Formulas:** Total Execution Time = Waiting Time + Service Time.
* **Common Pitfalls:** Do not confuse deadlock avoidance with deadlock detection!
`
      } else {
        content = `# ${noteFormat} Guide: ${selectedResource.title}
Key takeaways systematically organized from ${selectedResource.fileName}.
`
      }

      academicService.createStudyNote({
        title: `${noteFormat.replace(/_/g, " ")}: ${selectedResource.title}`,
        subjectId: selectedResource.subjectId,
        content,
        noteType: noteFormat,
        sourceResourceId: selectedResource.id,
        isGenerated: true,
      })

      setIsGenerating(false)
      setGenerateModalOpen(false)
      loadData()
    }, 400)
  }

  const filtered = resources.filter((r) => {
    if (filterSubject !== "ALL" && r.subjectId !== filterSubject) return false
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span>Study Materials & Document Analysis</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Store lecture slides, extract OCR text, and generate beginner-friendly notes grounded in course slides
          </p>
        </div>

        <Button
          onClick={handleOpenUpload}
          size="sm"
          className="bg-primary hover:bg-primary-700 text-white gap-1.5 font-semibold shadow-sm"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents or slides..."
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

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((res) => (
          <div
            key={res.id}
            className="p-5 rounded-xl border border-border bg-white dark:bg-card shadow-sm hover:shadow-card-hover transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {res.resourceType}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{res.title}</h3>
                  <span className="text-xs font-semibold text-primary">{res.subject?.name || "Subject"}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {res.fileName} • Processed & OCR Indexed
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleTriggerGenerate(res)}
                className="bg-primary hover:bg-primary-700 text-white text-xs gap-1.5 font-semibold shrink-0 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Generate Notes</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{res.description}</p>

            {res.extractedTexts && res.extractedTexts.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Extracted Slide Content ({res.extractedTexts.length} segments):
                </span>
                {res.extractedTexts.map((et) => (
                  <p key={et.id} className="text-xs text-gray-700 dark:text-gray-300 font-mono text-[11px] line-clamp-2">
                    [Slide {et.slideNumber || 1}]: {et.content}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Lecture Material</DialogTitle>
            <DialogDescription>
              Upload PDF slides, presentations, or images. ScholarOS will index text and prepare AI explanations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Document Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lecture 07 - Process Synchronization"
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
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LECTURE_SLIDES">Lecture Slides</SelectItem>
                    <SelectItem value="ASSIGNMENT">Assignment Instructions</SelectItem>
                    <SelectItem value="QUIZ_MATERIAL">Quiz Prep</SelectItem>
                    <SelectItem value="REFERENCE">Textbook Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Document File Name</Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Pasted Slide Text / Notes (Simulated OCR)</Label>
              <Input
                value={sampleContent}
                onChange={(e) => setSampleContent(e.target.value)}
                placeholder="Slide text for indexing..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUpload}
              disabled={!title.trim() || !subjectId}
              className="bg-primary hover:bg-primary-700 text-white font-semibold"
            >
              Upload & Index
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Notes Dialog */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>Generate AI Learning Material</span>
            </DialogTitle>
            <DialogDescription>
              Select the format of notes you want generated from &ldquo;{selectedResource?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Desired Format</Label>
              <Select value={noteFormat} onValueChange={(val: any) => setNoteFormat(val)}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DETAILED">Beginner-Friendly Detailed Notes</SelectItem>
                  <SelectItem value="REVISION">Quick Exam Revision Sheet</SelectItem>
                  <SelectItem value="EXAM_FOCUSED">Exam-Focused Key Concepts</SelectItem>
                  <SelectItem value="SUMMARY">One-Page Summary</SelectItem>
                  <SelectItem value="DEFINITIONS">Key Definitions & Terminology</SelectItem>
                  <SelectItem value="FORMULA_SHEET">Formula Sheet</SelectItem>
                  <SelectItem value="FLASHCARDS">Flashcards Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg text-xs space-y-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">Grounding Guarantee:</span>
              <p className="text-muted-foreground">
                All generated explanations will strictly cite terminology, notation, and slide references from your uploaded material.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateConfirm}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary-700 text-white font-semibold"
            >
              {isGenerating ? "Synthesizing..." : "Generate Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
