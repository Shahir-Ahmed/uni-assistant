"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export interface UserProfile {
  id: string
  name: string
  email: string
  role?: string
  timezone?: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  semester?: string
  major?: string
  whatsappPermissionGranted: boolean
  whatsappPhone?: string
  whatsappPaired?: boolean
  autoSyncAssignments?: boolean
  autoSyncQuizzes?: boolean
  autoSyncNotes?: boolean
  filterChitChat?: boolean
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  login: (email: string, password: string, redirectTo?: string) => Promise<void>
  register: (data: RegisterPayload, redirectTo?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.warn("Failed to check auth status:", err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string, redirectTo = "/") => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in.")
      }

      setUser(data.user)
      if (typeof window !== "undefined") {
        localStorage.clear()
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      }
      router.replace(redirectTo)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterPayload, redirectTo = "/") => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || "Failed to create student account.")
      }

      setUser(result.user)
      if (typeof window !== "undefined") {
        localStorage.clear()
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      }
      router.replace(redirectTo)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      if (typeof window !== "undefined") {
        localStorage.clear()
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      }
      router.replace("/login")
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
