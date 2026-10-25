"use client"

import * as React from "react"
import { Search, Bell, Menu, PlusCircle, Bot, Sparkles, Moon, Sun, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { academicService } from "@/lib/academic-service"
import { Reminder } from "@/types"

interface HeaderProps {
  onQuickCapture?: () => void
  onToggleMobileNav?: () => void
}

export function Header({ onQuickCapture, onToggleMobileNav }: HeaderProps) {
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    try {
      const activeReminders = academicService.getReminders()
      setReminders(activeReminders.filter((r) => r.status === 'PENDING').slice(0, 5))

      if (document.documentElement.classList.contains("dark")) {
        setIsDark(true)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark")
      setIsDark(false)
    } else {
      document.documentElement.classList.add("dark")
      setIsDark(true)
    }
  }

  return (
    <header className="h-16 border-b border-border bg-white/80 dark:bg-card/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileNav}
          className="lg:hidden h-9 w-9 text-gray-600 dark:text-gray-300"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-gray-800 dark:text-gray-200">ScholarOS</span>
          <span>/</span>
          <span className="text-primary font-medium">Academic Command Center</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (searchQuery.trim()) {
              window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
            }
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects, assignments, lecture slides, formulas..."
            className="pl-9 bg-gray-50/80 dark:bg-card border-border h-9 rounded-lg text-xs placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </form>
      </div>

      {/* Actions: Quick Capture, AI Chat, Reminders, Theme */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onQuickCapture}
          size="sm"
          className="hidden sm:flex items-center gap-1.5 bg-primary hover:bg-primary-700 text-white rounded-lg h-9 px-3 text-xs font-semibold shadow-sm"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Capture</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = "/assistant")}
          className="flex items-center gap-1.5 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary rounded-lg h-9 px-3 text-xs font-medium"
        >
          <Bot className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
          <Sparkles className="h-3 w-3 text-amber-500 hidden sm:inline" />
        </Button>

        {/* Reminders / Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-gray-600 dark:text-gray-300">
              <Bell className="h-4 w-4" />
              {reminders.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              )}
              {reminders.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Reminders & Alerts</span>
              <Badge variant="outline" className="text-[10px] font-bold">
                {reminders.length} Active
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {reminders.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No approaching deadlines right now! All clear.
              </div>
            ) : (
              reminders.map((r) => (
                <DropdownMenuItem key={r.id} className="flex flex-col items-start p-3 gap-1 cursor-pointer">
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">{r.title}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Due soon</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.message}</p>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-gray-600 dark:text-gray-300"
          title="Toggle Dark Mode"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
