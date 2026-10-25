"use client"

import * as React from "react"
import Link from "next/link"
import {
  Inbox as InboxIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { academicService } from "@/lib/academic-service"
import { Announcement } from "@/types"
import { formatRelativeDate } from "@/lib/utils"

export default function InboxPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])

  React.useEffect(() => {
    setAnnouncements(academicService.getAnnouncements())
  }, [])

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <InboxIcon className="h-6 w-6 text-primary" />
          <span>Capture Inbox & Review Queue</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Newly captured messages from WhatsApp, CR announcements, and automated extractions
        </p>
      </div>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl bg-gray-50/50 dark:bg-card/50">
            <InboxIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Inbox is empty</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              All announcements have been categorized into your calendar and subjects.
            </p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-5 rounded-xl border border-border bg-white dark:bg-card shadow-sm space-y-2 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold text-primary">
                    {ann.category}
                  </Badge>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {ann.source || "CR / WhatsApp"}
                  </span>
                  {ann.sourceGroup && (
                    <span className="text-[11px] text-muted-foreground font-medium">({ann.sourceGroup})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeDate(ann.dateReceived)}
                  </span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-[10px] font-bold">
                    Organized
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-card border border-border rounded-lg text-xs italic text-gray-800 dark:text-gray-200">
                &ldquo;{ann.originalMessage}&rdquo;
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Associated Subject: <span className="font-bold text-gray-800 dark:text-gray-200">{ann.subject?.name || "Unassigned"}</span></span>
                <Link href={`/assistant?prep=${encodeURIComponent(ann.originalMessage.slice(0, 30))}`}>
                  <Button size="sm" variant="ghost" className="text-xs text-primary font-semibold gap-1">
                    <span>Ask AI About This</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
