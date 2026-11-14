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
  onboardingSessionId?: string
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

const TOKEN_STORAGE_KEY = "scholaros_auth_token"

async function parseJsonSafe(res: Response): Promise<any> {
  const raw = await res.text()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return { error: raw.slice(0, 200) }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()

  const refreshUser = React.useCallback(async () => {
    try {
      let savedToken = ""
      try {
        savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY) || ""
      } catch {
        // ignore storage restrictions
      }
      const headers: Record<string, string> = {}
      if (savedToken) {
        headers.Authorization = `Bearer ${savedToken}`
      }
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
        headers,
      })
      if (res.ok) {
        const data = await parseJsonSafe(res)
        if (data.user) {
          setUser(data.user)
        } else {
          setUser(null)
          try {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY)
          } catch {
            // ignore
          }
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/signup") &&
            !window.location.pathname.startsWith("/login")
          ) {
            router.replace("/signup")
          }
        }
      } else {
        setUser(null)
      }
    } catch (err) {
      console.warn("Failed to check auth status:", err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  React.useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string, redirectTo = "/") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await parseJsonSafe(res)
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in. Please verify your credentials.")
      }

      try {
        localStorage.clear()
        if (data.token) {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token)
        }
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      } catch {
        // ignore storage errors in restricted iframes
      }

      setUser(data.user)
      router.replace(redirectTo)
    } catch (err) {
      throw err
    }
  }

  const register = async (data: RegisterPayload, redirectTo = "/") => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })

      const result = await parseJsonSafe(res)
      if (!res.ok) {
        throw new Error(result.error || "Failed to create student account.")
      }

      try {
        localStorage.clear()
        if (result.token) {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, result.token)
        }
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      } catch {
        // ignore storage errors in restricted iframes
      }

      setUser(result.user)
      router.replace(redirectTo)
    } catch (err) {
      throw err
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      setUser(null)
      try {
        localStorage.clear()
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      } catch {
        // ignore
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
