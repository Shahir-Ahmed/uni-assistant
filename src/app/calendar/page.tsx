"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"
import { Assignment, AcademicEvent } from "@/types"
import { formatDate, formatDateTime, formatRelativeDate, getPriorityColor, isOverdue } from "@/lib/utils"

export default function CalendarPage() {
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  const [events, setEvents] = React.useState<AcademicEvent[]>([])
  const [currentDate, setCurrentDate] = React.useState(new Date(2026, 9, 25)) // Oct 25, 2026
  const [viewMode, setViewMode] = React.useState<"MONTH" | "LIST">("MONTH")

  React.useEffect(() => {
    setAssignments(academicService.getAssignments())
    setEvents(academicService.getEvents())
  }, [])

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  // Collect all items with dates
  const calendarItems: {
    id: string
    title: string
    date: Date
    type: "ASSIGNMENT" | "QUIZ" | "EXAM" | "PRESENTATION"
    subjectName: string
    color: string
    link: string
  }[] = []

  assignments.forEach((asg) => {
    if (asg.deadline) {
      calendarItems.push({
        id: asg.id,
        title: asg.title,
        date: new Date(asg.deadline),
        type: "ASSIGNMENT",
        subjectName: asg.subject?.name || "Assignment",
        color: "#1E3A5F",
        link: `/assignments#${asg.id}`,
      })
    }
  })

  events.forEach((evt) => {
    if (evt.date) {
      calendarItems.push({
        id: evt.id,
        title: evt.title,
        date: new Date(evt.date),
        type: evt.eventType as any,
        subjectName: evt.subject?.name || "Event",
        color: evt.eventType === "QUIZ" ? "#F59E0B" : "#DC2626",
        link: `/events`,
      })
    }
  })

  // Group items by day number in current month
  const getItemsForDay = (day: number) => {
    return calendarItems.filter((item) => {
      return (
        item.date.getFullYear() === year &&
        item.date.getMonth() === month &&
        item.date.getDate() === day
      )
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <span>Academic Calendar & Planner</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unified schedule of assignment deadlines, quizzes, midterms, and project milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-gray-100 dark:bg-card">
            <button
              onClick={() => setViewMode("MONTH")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "MONTH" ? "bg-white dark:bg-gray-800 text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewMode("LIST")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "LIST" ? "bg-white dark:bg-gray-800 text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Upcoming Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Month Navigation Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {monthNames[month]} {year}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(new Date(2026, 9, 25))}
            className="text-xs h-7 px-2 font-semibold text-primary"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "MONTH" ? (
        /* Month Grid View */
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-gray-50/50 dark:bg-gray-900/50 text-center py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[105px] p-2 bg-gray-50/20 dark:bg-gray-900/10 opacity-40" />
            ))}

            {/* Days of month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1
              const dayItems = getItemsForDay(day)
              const isToday =
                day === 25 && month === 9 && year === 2026

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-[105px] p-2 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${
                    isToday ? "bg-primary/5 font-semibold" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs h-6 w-6 rounded-full flex items-center justify-center font-bold ${
                        isToday
                          ? "bg-primary text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {day}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <Link
                        key={item.id}
                        href={item.link}
                        className="block px-2 py-1 rounded text-[11px] font-semibold text-white truncate hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: item.color }}
                        title={`${item.title} (${item.subjectName})`}
                      >
                        {item.type === "ASSIGNMENT" ? "📝" : "⏱️"} {item.title}
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-semibold block px-1">
                        +{dayItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Upcoming Agenda List View */
        <div className="space-y-3">
          {calendarItems
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border bg-white dark:bg-card shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.type === "ASSIGNMENT" ? "HW" : "EX"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.subjectName} • {formatDateTime(item.date)} ({formatRelativeDate(item.date)})
                    </p>
                  </div>
                </div>

                <Link href={item.link}>
                  <Button size="sm" variant="outline" className="text-xs font-semibold">
                    Open Details
                  </Button>
                </Link>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
