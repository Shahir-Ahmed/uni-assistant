"use client"

import * as React from "react"
import Link from "next/link"
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [redirectTo, setRedirectTo] = React.useState("/")

  React.useEffect(() => {
    const rawNext = new URLSearchParams(window.location.search).get("next")
    if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
      setRedirectTo(rawNext)
    }
  }, [])

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }

    setSubmitting(true)
    try {
      await login(email, password, redirectTo)
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gray-50/60 dark:bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* University Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-white shadow-md shadow-primary/20 mb-2">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Scholar<span className="text-secondary-600 font-extrabold">OS</span>
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Private University Academic Command Center
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Student Sign In</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to unlock your private, isolated academic workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Student Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="pl-9 h-10 text-xs"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-10 text-xs"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary-700 text-white rounded-lg gap-2 shadow-xs"
              >
                {submitting ? "Signing In..." : "Sign In to Private Workspace"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>

            {/* New User Onboarding Callout */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>New to ScholarOS?</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Sign up with WhatsApp integration permission to create your own private academic space with isolated storage.
              </p>
              <Link href="/signup" className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs font-semibold border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 gap-1.5"
                >
                  <span>Sign Up &amp; Connect WhatsApp</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex justify-center border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Need a private student account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-primary hover:text-primary-700 underline underline-offset-4"
              >
                Register with WhatsApp permission
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3 text-center text-[11px] text-muted-foreground">
          <div className="p-2.5 rounded-lg border border-border/60 bg-white/50 dark:bg-card/50 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Private &amp; Isolated</span>
          </div>
          <div className="p-2.5 rounded-lg border border-border/60 bg-white/50 dark:bg-card/50 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>WhatsApp Sync Ready</span>
          </div>
        </div>
      </div>
    </div>
  )
}
