"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

export interface UserProfile {
  id: string
  name: string
  email: string
  role?: string
  timezone?: string
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginAsDemo: () => Promise<void>
  register: (data: {
    name: string
    email: string
    password: string
    semester?: string
    major?: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
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

  const login = async (email: string, password: string) => {
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
        // Clear local caches to avoid data mixing
        localStorage.clear()
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      }
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  const loginAsDemo = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDemo: true }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in to demo.")
      }

      setUser(data.user)
      if (typeof window !== "undefined") {
        localStorage.clear()
        window.dispatchEvent(new Event("scholaros_auth_changed"))
      }
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    semester?: string
    major?: string
  }) => {
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
      router.push("/")
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
      router.push("/login")
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
        loginAsDemo,
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
