"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Search as SearchIcon,
  BookOpen,
  CheckSquare,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { academicService } from "@/lib/academic-service"
import { formatDate } from "@/lib/utils"

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") || ""

  const [query, setQuery] = React.useState(initialQ)
  const [results, setResults] = React.useState<{
    subjects: any[]
    assignments: any[]
    events: any[]
    announcements: any[]
    notes: any[]
    resources: any[]
  }>({
    subjects: [],
    assignments: [],
    events: [],
    announcements: [],
    notes: [],
    resources: [],
  })

  const performSearch = React.useCallback((q: string) => {
    const res = academicService.searchAll(q)
    setResults(res)
  }, [])

  React.useEffect(() => {
    if (initialQ) {
      setQuery(initialQ)
      performSearch(initialQ)
    }
  }, [initialQ, performSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const totalResults =
    results.subjects.length +
    results.assignments.length +
    results.events.length +
    results.announcements.length +
    results.notes.length +
    results.resources.length

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <SearchIcon className="h-6 w-6 text-primary" />
          <span>Unified Academic Search</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search across subjects, assignment instructions, announcements, slide contents, and AI notes
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. 'deadlock', 'ER diagram', 'quiz', 'database'..."
            className="pl-10 h-11 text-sm bg-white dark:bg-card border-border focus-visible:ring-primary shadow-sm"
          />
        </div>
        <Button type="submit" className="bg-primary hover:bg-primary-700 text-white font-semibold h-11 px-6 shadow-sm">
          Search
        </Button>
      </form>

      {query && (
        <div className="text-xs text-muted-foreground font-medium">
          Found <span className="font-bold text-gray-900 dark:text-gray-100">{totalResults} result{totalResults === 1 ? "" : "s"}</span> for &ldquo;{query}&rdquo;
        </div>
      )}

      <div className="space-y-6">
        {results.assignments.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>Assignments ({results.assignments.length})</span>
            </h3>
            <div className="space-y-2">
              {results.assignments.map((asg) => (
                <div key={asg.id} className="p-3.5 rounded-xl border border-border bg-white dark:bg-card shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{asg.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{asg.description}</p>
                    <span className="text-[11px] text-primary font-medium mt-1 block">
                      Due: {formatDate(asg.deadline)} • {asg.subject?.name}
                    </span>
                  </div>
                  <Link href={`/assignments#${asg.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.resources.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Slides & Lecture Documents ({results.resources.length})</span>
            </h3>
            <div className="space-y-2">
              {results.resources.map((res) => (
                <div key={res.id} className="p-3.5 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-1.5">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{res.title}</h4>
                  <p className="text-xs text-muted-foreground">{res.description}</p>
                  {res.extractedTexts && (
                    <div className="p-2 bg-gray-50 dark:bg-card border border-border rounded text-[11px] font-mono text-gray-700 dark:text-gray-300">
                      Matched text: {res.extractedTexts[0]?.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {results.subjects.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Subjects ({results.subjects.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.subjects.map((sub) => (
                <Link key={sub.id} href={`/subjects/${sub.id}`} className="p-3.5 rounded-xl border border-border bg-white dark:bg-card shadow-sm hover:border-primary block">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{sub.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sub.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {results.notes.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span>AI Study Guides ({results.notes.length})</span>
            </h3>
            <div className="space-y-2">
              {results.notes.map((note) => (
                <div key={note.id} className="p-3.5 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-1">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{note.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading search...</div>}>
      <SearchContent />
    </React.Suspense>
  )
}
