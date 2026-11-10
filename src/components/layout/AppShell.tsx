"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { QuickCaptureModal } from "@/components/capture/QuickCaptureModal"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [captureOpen, setCaptureOpen] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex w-full">
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
