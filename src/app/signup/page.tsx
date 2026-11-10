"use client"

import * as React from "react"
import Link from "next/link"
import { GraduationCap, ArrowRight, Lock, Mail, User, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

export default function SignupPage() {
  const { register, isLoading } = useAuth()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [semester, setSemester] = React.useState("Fall 2026")
  const [major, setMajor] = React.useState("Computer Science")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || name.trim().length < 2) {
      setError("Please enter your full name.")
      return
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid student email address.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.")
      return
    }

    setSubmitting(true)
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        semester,
        major,
      })
    } catch (err: any) {
      setError(err.message || "Failed to create student account.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gray-50/60 dark:bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-white shadow-md shadow-primary/20 mb-2">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Scholar<span className="text-secondary-600 font-extrabold">OS</span>
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Create Personal Academic Environment
          </p>
        </div>

        {/* Sign Up Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">Student Registration</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Set up your own dedicated university workspace with permanent storage
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="pl-9 h-10 text-xs"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* Student Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  University / Student Email
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

              {/* Semester & Major Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Semester Term</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                      <SelectItem value="Spring 2027">Spring 2027</SelectItem>
                      <SelectItem value="Summer 2027">Summer 2027</SelectItem>
                      <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Major / Program</Label>
                  <Select value={major} onValueChange={setMajor}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Software Engineering">Software Eng.</SelectItem>
                      <SelectItem value="Data Science & AI">Data Science & AI</SelectItem>
                      <SelectItem value="Information Systems">Info Systems</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Password */}
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
                    placeholder="At least 6 characters"
                    className="pl-9 h-10 text-xs"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="pl-9 h-10 text-xs"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary-700 text-white rounded-lg gap-2 shadow-xs"
                >
                  {submitting ? "Creating Environment..." : "Create Student Environment"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex justify-center border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary-700 underline underline-offset-4"
              >
                Sign in to your account
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Security / Privacy assurance */}
        <div className="p-3 rounded-xl border border-border/60 bg-white/60 dark:bg-card/60 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Multi-Tenant Student Isolation</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your university assignments, grades, notes, files, and AI assistant history are stored in a dedicated PostgreSQL partition private only to your student ID.
          </p>
        </div>
      </div>
    </div>
  )
}
