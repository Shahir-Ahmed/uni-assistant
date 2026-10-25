"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Calendar as CalendarIcon,
  FileText,
  Bot,
  Search,
  Inbox,
  Settings,
  GraduationCap,
  Sparkles,
  PlusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { academicService } from "@/lib/academic-service"

interface SidebarProps {
  onQuickCapture?: () => void
}

export function Sidebar({ onQuickCapture }: SidebarProps) {
  const pathname = usePathname()
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = React.useState(0)
  const [unprocessedInboxCount, setUnprocessedInboxCount] = React.useState(0)

  React.useEffect(() => {
    try {
      const assignments = academicService.getAssignments()
      const pending = assignments.filter((a) => !['COMPLETED', 'SUBMITTED', 'CANCELLED'].includes(a.status)).length
      setPendingAssignmentsCount(pending)
    } catch (e) {
      // ignore
    }
  }, [pathname])

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "My Subjects",
      href: "/subjects",
      icon: BookOpen,
    },
    {
      title: "Assignments",
      href: "/assignments",
      icon: CheckSquare,
      badge: pendingAssignmentsCount > 0 ? String(pendingAssignmentsCount) : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      title: "Events & Quizzes",
      href: "/events",
      icon: CalendarIcon,
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: CalendarIcon,
    },
    {
      title: "Study Materials",
      href: "/materials",
      icon: FileText,
    },
    {
      title: "AI Assistant",
      href: "/assistant",
      icon: Bot,
      highlight: true,
    },
    {
      title: "Search",
      href: "/search",
      icon: Search,
    },
    {
      title: "Inbox",
      href: "/inbox",
      icon: Inbox,
      badge: unprocessedInboxCount > 0 ? String(unprocessedInboxCount) : undefined,
    },
    {
      title: "Settings & Backup",
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-white dark:bg-card h-screen sticky top-0 shadow-sm z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-lg text-primary tracking-tight flex items-center gap-1.5">
              Scholar<span className="text-secondary-600 font-extrabold">OS</span>
            </span>
            <p className="text-[11px] text-muted-foreground font-medium">Personal AI University Assistant</p>
          </div>
        </Link>
      </div>

      {/* Quick Capture Button */}
      <div className="p-4">
        <Button
          onClick={onQuickCapture}
          className="w-full justify-center gap-2 bg-primary hover:bg-primary-700 text-white shadow-sm font-semibold rounded-lg h-11"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Quick Capture</span>
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-primary dark:text-gray-400"
                  )}
                />
                <span className={cn(item.highlight && !isActive && "text-primary font-semibold")}>
                  {item.title}
                </span>
              </div>

              {item.highlight && !isActive && (
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              )}

              {item.badge && (
                <Badge
                  variant={item.badgeVariant || "secondary"}
                  className={cn(
                    "h-5 px-1.5 text-[11px] font-bold rounded-full",
                    isActive && "bg-white/20 text-white"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Profile & Status */}
      <div className="p-4 border-t border-border bg-gray-50/50 dark:bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              ME
            </div>
            <div className="text-xs">
              <p className="font-semibold text-gray-900 dark:text-gray-100">My Workspace</p>
              <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>Local & Offline Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
