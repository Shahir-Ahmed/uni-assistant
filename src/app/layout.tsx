import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"

export const metadata: Metadata = {
  title: "ScholarOS — Personal AI University Assistant",
  description:
    "Personal AI University Assistant & Academic Management Command Center. Organize subjects, manage assignments, capture announcements, and prepare for quizzes with AI.",
  openGraph: {
    title: "ScholarOS — Personal AI University Assistant",
    description:
      "Personal AI University Assistant & Academic Management Command Center. Organize subjects, manage assignments, capture announcements, and prepare for quizzes with AI.",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
