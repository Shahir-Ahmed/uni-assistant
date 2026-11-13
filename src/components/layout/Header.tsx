"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Bell, Menu, Moon, Sun, User as UserIcon, LogOut, LogIn, UserPlus, Settings } from "lucide-react"
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
import { useAuth } from "@/lib/auth-context"

interface HeaderProps {
  onQuickCapture?: () => void
  onToggleMobileNav?: () => void
}

export function Header({ onQuickCapture, onToggleMobileNav }: HeaderProps) {
  const { user, logout } = useAuth()
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDark, setIsDark] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    try {
      const activeReminders = academicService.getReminders()
      setReminders(activeReminders.filter((r) => r.status === "PENDING").slice(0, 5))

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

  // Get user initials e.g. "Sarah Connor" -> "SC"
  const getInitials = (name?: string | null) => {
    if (!name) return "ST"
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header className="h-16 border-b border-border bg-white/80 dark:bg-card/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between" suppressHydrationWarning>
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

      {/* Actions: Reminders, Theme, Student Profile / Auth */}
      <div className="flex items-center gap-2.5">
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
          suppressHydrationWarning
        >
          <span className="flex items-center justify-center" suppressHydrationWarning>
            {mounted && isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </span>
        </Button>

        {/* Student Profile / Auth Dropdown */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-muted transition-colors focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-tight text-gray-900 dark:text-gray-100 max-w-[120px] truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Workspace Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="h-8 px-3 text-xs font-semibold bg-primary text-white">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
