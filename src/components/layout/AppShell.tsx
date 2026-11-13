"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { ShieldCheck, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { QuickCaptureModal } from "@/components/capture/QuickCaptureModal"
import { AuthProvider, useAuth } from "@/lib/auth-context"

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [captureOpen, setCaptureOpen] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  React.useEffect(() => {
    const handleOpenCapture = () => setCaptureOpen(true)
    window.addEventListener("scholaros_open_capture", handleOpenCapture)
    return () => window.removeEventListener("scholaros_open_capture", handleOpenCapture)
  }, [])

  // Auth pages (login, signup) render standalone without the academic sidebar/header
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  React.useEffect(() => {
    if (isLoading) return

    if (!isAuthPage && !user) {
      const nextParam = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/signup${nextParam}`)
    } else if (isAuthPage && user) {
      router.replace("/")
    }
  }, [isAuthPage, isLoading, user, pathname, router])

  if (isAuthPage) {
    if (!isLoading && user) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground">Entering your private workspace...</p>
        </div>
      )
    }
    return <main className="min-h-screen w-full" suppressHydrationWarning>{children}</main>
  }

  // Block unauthenticated rendering of private workspace content
  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 text-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">Verifying Private Academic Workspace</p>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Checking your isolated student session..." : "Redirecting to student registration..."}
          </p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-primary mt-1" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex w-full" suppressHydrationWarning>
      {/* Desktop Sidebar */}
      <Sidebar onQuickCapture={() => setCaptureOpen(true)} />

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-card h-full shadow-2xl z-10 flex flex-col">
            <Sidebar
              className="flex"
              onQuickCapture={() => {
                setMobileNavOpen(false)
                setCaptureOpen(true)
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onQuickCapture={() => setCaptureOpen(true)}
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Global Quick Capture Modal */}
      <QuickCaptureModal
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onSuccess={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("scholaros_data_updated"))
          }
        }}
      />
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellInner>{children}</AppShellInner>
    </AuthProvider>
  )
}
