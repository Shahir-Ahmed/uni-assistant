"use client"

import * as React from "react"
import Link from "next/link"
import {
  GraduationCap,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  QrCode,
  Smartphone,
  Phone,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { WhatsAppQRCode } from "@/components/whatsapp/WhatsAppQRCode"

export default function SignupPage() {
  const { register, isLoading } = useAuth()
  const [redirectTo, setRedirectTo] = React.useState("/")
  const [mounted, setMounted] = React.useState(false)

  // Multi-step onboarding state
  const [step, setStep] = React.useState<1 | 2>(1)

  // Step 1: Private Student Account
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [semester, setSemester] = React.useState("Fall 2026")
  const [major, setMajor] = React.useState("Computer Science")

  // Step 2: WhatsApp Integration Permission & Real Baileys Pairing
  const [whatsappPermissionGranted, setWhatsappPermissionGranted] = React.useState(false)
  const [whatsappPhone, setWhatsappPhone] = React.useState("")
  const [linkMode, setLinkMode] = React.useState<"QR" | "CODE" | "LATER">("QR")
  const [whatsappPaired, setWhatsappPaired] = React.useState(false)
  const [autoSyncAssignments, setAutoSyncAssignments] = React.useState(true)
  const [autoSyncQuizzes, setAutoSyncQuizzes] = React.useState(true)
  const [autoSyncNotes, setAutoSyncNotes] = React.useState(true)
  const [filterChitChat, setFilterChitChat] = React.useState(true)

  // Live WhatsApp Handshake State
  const [onboardingId, setOnboardingId] = React.useState("")
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [qrString, setQrString] = React.useState<string | null>(null)
  const [waVersion, setWaVersion] = React.useState<string | null>(null)
  const [qrCountdown, setQrCountdown] = React.useState(45)
  const [isRefreshingQr, setIsRefreshingQr] = React.useState(false)
  const [pairingCode, setPairingCode] = React.useState<string | null>(null)
  const [isRequestingCode, setIsRequestingCode] = React.useState(false)
  const [waError, setWaError] = React.useState<string | null>(null)
  const [connectedGroupCount, setConnectedGroupCount] = React.useState(0)
  const [copiedCode, setCopiedCode] = React.useState(false)

  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const rawNext = new URLSearchParams(window.location.search).get("next")
    if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
      setRedirectTo(rawNext)
    }
    setOnboardingId(`onb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  }, [])

  const startLiveWhatsApp = React.useCallback(
    async (mode: "QR" | "CODE", forceFresh = false) => {
      if (!onboardingId) return
      setWaError(null)
      if (mode === "QR") {
        setIsRefreshingQr(true)
      } else {
        setIsRequestingCode(true)
      }

      try {
        const res = await fetch("/api/whatsapp/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onboardingId,
            mode,
            phoneNumber: whatsappPhone,
            forceFresh,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setWaError(data.error || "Unable to connect to WhatsApp servers.")
          return
        }

        const sess = data.session
        if (sess) {
          if (sess.waVersion) setWaVersion(sess.waVersion)
          if (sess.qrDataUrl) setQrDataUrl(sess.qrDataUrl)
          if (sess.qrString) setQrString(sess.qrString)
          if (sess.pairingCode) setPairingCode(sess.pairingCode)
          if (sess.lastError) setWaError(sess.lastError)
          if (sess.qrGeneratedAt) setQrCountdown(45)
          if (sess.status === "CONNECTED") {
            setWhatsappPaired(true)
            if (sess.phoneNumber) setWhatsappPhone(sess.phoneNumber)
            setConnectedGroupCount(Array.isArray(sess.groups) ? sess.groups.length : 0)
          }
        }
      } catch (err: any) {
        setWaError(err?.message || "Network error reaching WhatsApp handshake backend.")
      } finally {
        setIsRefreshingQr(false)
        setIsRequestingCode(false)
      }
    },
    [onboardingId, whatsappPhone]
  )

  // Automatically start WhatsApp QR handshake when entering Step 2
  React.useEffect(() => {
    if (step === 2 && linkMode === "QR" && !whatsappPaired && !qrDataUrl && onboardingId) {
      startLiveWhatsApp("QR", false)
    }
  }, [step, linkMode, whatsappPaired, qrDataUrl, onboardingId, startLiveWhatsApp])

  // Poll WhatsApp session status so scanning the QR or entering code auto-completes
  React.useEffect(() => {
    if (step !== 2 || linkMode === "LATER" || whatsappPaired || !onboardingId) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/onboarding?onboardingId=${encodeURIComponent(onboardingId)}`)
        if (!res.ok) return
        const data = await res.json()
        const sess = data.session
        if (!sess) return

        if (sess.qrDataUrl && sess.qrString !== qrString) {
          setQrDataUrl(sess.qrDataUrl)
          setQrString(sess.qrString)
          setQrCountdown(45)
        }
        if (sess.waVersion) setWaVersion(sess.waVersion)
        if (sess.pairingCode) setPairingCode(sess.pairingCode)
        if (sess.status === "CONNECTED") {
          setWhatsappPaired(true)
          if (sess.phoneNumber) setWhatsappPhone(sess.phoneNumber)
          setConnectedGroupCount(Array.isArray(sess.groups) ? sess.groups.length : 0)
        }
      } catch {
        // ignore transient poll error
      }
    }, 2500)
    return () => clearInterval(poll)
  }, [step, linkMode, whatsappPaired, onboardingId, qrString])

  // Countdown tick for visual QR timer
  React.useEffect(() => {
    if (step !== 2 || linkMode !== "QR" || whatsappPaired || !qrDataUrl) return
    const timer = setInterval(() => {
      setQrCountdown((prev) => (prev > 1 ? prev - 1 : 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [step, linkMode, whatsappPaired, qrDataUrl])

  const handleContinueToStep2 = (e: React.FormEvent) => {
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

    setStep(2)
  }

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!whatsappPermissionGranted) {
      setError("Please grant WhatsApp integration permission to create your private workspace.")
      return
    }

    setSubmitting(true)
    try {
      await register(
        {
          name: name.trim(),
          email: email.trim(),
          password,
          semester,
          major,
          whatsappPermissionGranted: true,
          whatsappPhone: whatsappPhone.trim(),
          whatsappPaired: linkMode !== "LATER" && whatsappPaired,
          onboardingSessionId: onboardingId,
          autoSyncAssignments,
          autoSyncQuizzes,
          autoSyncNotes,
          filterChitChat,
        },
        redirectTo
      )
    } catch (err: any) {
      setError(err.message || "Failed to create student account.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-gray-50/70 dark:bg-background">
      <div className="w-full max-w-lg space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-white shadow-md shadow-primary/20 mb-1">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Scholar<span className="text-secondary-600 font-extrabold">OS</span>
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Sign Up &amp; Authorize WhatsApp Integration
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => step === 2 && setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold border transition-all ${
              step === 1
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
              {step > 1 ? "✓" : "1"}
            </span>
            <span>Private Account</span>
          </button>
          <div className="h-px w-6 bg-border" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold border transition-all ${
              step === 2
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>WhatsApp Permission</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                {step === 1 ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span>Create Private Student Space</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                    <span>WhatsApp Integration Permission</span>
                  </>
                )}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold border-emerald-400/50 text-emerald-700 dark:text-emerald-300">
                Step {step} of 2
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {step === 1
                ? "New users must register first so every student has an isolated, encrypted workspace."
                : "Authorize WhatsApp Multi-Device sync and scan the live WhatsApp QR or pairing code below."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleContinueToStep2} className="space-y-3.5">
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Semester Term</Label>
                    {mounted ? (
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
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs"
                      >
                        <span className="truncate">{semester}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Major / Program</Label>
                    {mounted ? (
                      <Select value={major} onValueChange={setMajor}>
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder="Program" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Software Engineering">Software Eng.</SelectItem>
                          <SelectItem value="Data Science & AI">Data Science &amp; AI</SelectItem>
                          <SelectItem value="Information Systems">Info Systems</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs"
                      >
                        <span className="truncate">{major}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        placeholder="Min 6 characters"
                        className="pl-9 h-10 text-xs"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

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
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary-700 text-white rounded-lg gap-2 shadow-xs"
                  >
                    <span>Continue to WhatsApp Permission</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteSignup} className="space-y-4">
                {/* Mandatory Permission Box */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    whatsappPermissionGranted
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400"
                      : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      id="whatsappPermissionCheckbox"
                      type="checkbox"
                      checked={whatsappPermissionGranted}
                      onChange={(e) => setWhatsappPermissionGranted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="whatsappPermissionCheckbox"
                      className="space-y-1 text-xs cursor-pointer select-none"
                    >
                      <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 flex-wrap">
                        <span>Grant WhatsApp Integration Permission (Required)</span>
                        <span className="inline-flex items-center rounded-full border border-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Private Access
                        </span>
                      </span>
                      <span className="block text-[11px] text-muted-foreground leading-relaxed">
                        I authorize ScholarOS to connect with my linked WhatsApp study groups and communities to
                        extract academic quizzes, assignments, and lecture notes strictly into my private space.
                        Personal messages and non-academic banter are discarded.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Granular Sync Permissions */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp Data Permissions</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Extract Assignments &amp; Deadlines</span>
                    <Switch checked={autoSyncAssignments} onCheckedChange={setAutoSyncAssignments} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Extract Quizzes &amp; Exam Dates</span>
                    <Switch checked={autoSyncQuizzes} onCheckedChange={setAutoSyncQuizzes} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Save Cheatsheets &amp; Study Notes</span>
                    <Switch checked={autoSyncNotes} onCheckedChange={setAutoSyncNotes} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Strict Privacy Filter (Discard Chit-Chat)</span>
                    <Switch checked={filterChitChat} onCheckedChange={setFilterChitChat} />
                  </div>
                </div>

                {/* Live WhatsApp Device Pairing Selector */}
                <div className="space-y-3 rounded-xl border border-border p-3.5 bg-card">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Link Your WhatsApp Device</span>
                    </Label>
                    <div className="flex rounded-lg border border-border p-0.5 bg-muted/60">
                      <button
                        type="button"
                        onClick={() => {
                          setLinkMode("QR")
                          setWaError(null)
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                          linkMode === "QR" ? "bg-white dark:bg-card text-emerald-700 shadow-xs" : "text-muted-foreground"
                        }`}
                      >
                        <QrCode className="h-3 w-3" />
                        <span>QR Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkMode("CODE")
                          setWaError(null)
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                          linkMode === "CODE" ? "bg-white dark:bg-card text-emerald-700 shadow-xs" : "text-muted-foreground"
                        }`}
                      >
                        <Smartphone className="h-3 w-3" />
                        <span>Phone Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkMode("LATER")
                          setWaError(null)
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                          linkMode === "LATER" ? "bg-white dark:bg-card text-emerald-700 shadow-xs" : "text-muted-foreground"
                        }`}
                      >
                        Pair After Signup
                      </button>
                    </div>
                  </div>

                  {waError && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{waError}</span>
                    </div>
                  )}

                  {whatsappPaired ? (
                    <div className="w-full p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 space-y-1 text-xs">
                      <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>WhatsApp Authorized &amp; Connected!</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Linked to {whatsappPhone || "your WhatsApp account"}
                        {connectedGroupCount > 0 ? ` • Discovered ${connectedGroupCount} WhatsApp groups` : ""}.
                      </p>
                    </div>
                  ) : linkMode === "QR" ? (
                    <div className="flex flex-col items-center space-y-3 pt-1">
                      <div className="relative">
                        <WhatsAppQRCode
                          qrDataUrl={qrDataUrl}
                          qrString={qrString}
                          waVersion={waVersion}
                          size={180}
                          isRefreshing={isRefreshingQr}
                          error={waError}
                          onRefresh={() => startLiveWhatsApp("QR", true)}
                        />
                        {qrDataUrl && (
                          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3 text-emerald-600" />
                            <span>QR expires in ~{qrCountdown}s</span>
                            <button
                              type="button"
                              onClick={() => startLiveWhatsApp("QR", true)}
                              disabled={isRefreshingQr}
                              className="text-emerald-700 dark:text-emerald-300 font-semibold hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className={`h-3 w-3 ${isRefreshingQr ? "animate-spin" : ""}`} />
                              <span>Refresh</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        Open <strong>WhatsApp</strong> &rarr; <strong>Linked Devices</strong> &rarr;{" "}
                        <strong>Link a Device</strong> and scan the live QR code above.
                      </p>
                    </div>
                  ) : linkMode === "CODE" ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="waPhone" className="text-[11px] font-semibold text-muted-foreground">
                          WhatsApp Phone Number (Include country code, e.g. +923001234567)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="waPhone"
                            type="tel"
                            value={whatsappPhone}
                            onChange={(e) => setWhatsappPhone(e.target.value)}
                            placeholder="+923001234567"
                            className="h-9 text-xs font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRequestingCode || !whatsappPhone.trim()}
                            onClick={() => startLiveWhatsApp("CODE", true)}
                            className="h-9 text-xs font-semibold shrink-0 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                          >
                            {isRequestingCode ? "Requesting..." : "Get Official Code"}
                          </Button>
                        </div>
                      </div>

                      {pairingCode && (
                        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-center space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            Official 8-Character WhatsApp Pairing Code
                          </span>
                          <div className="flex items-center justify-center gap-1">
                            {pairingCode
                              .replace("-", "")
                              .split("")
                              .map((char, idx) => (
                                <React.Fragment key={idx}>
                                  {idx === 4 && <span className="text-base font-bold text-emerald-600 px-0.5">-</span>}
                                  <div className="h-8 w-7 rounded-md bg-white dark:bg-card border border-emerald-500 text-emerald-800 dark:text-emerald-200 font-mono font-extrabold text-sm flex items-center justify-center">
                                    {char}
                                  </div>
                                </React.Fragment>
                              ))}
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(pairingCode)
                                setCopiedCode(true)
                                setTimeout(() => setCopiedCode(false), 1800)
                              }}
                              className="h-7 text-[11px] gap-1"
                            >
                              {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Enter this code on your phone under WhatsApp &rarr; Linked Devices &rarr; Link with phone number.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg">
                      Permission will be saved to your private profile now. You can scan the live WhatsApp QR code
                      anytime from the <strong>WhatsApp Sync</strong> tab inside your workspace.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-10 px-3 text-xs font-semibold gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || isLoading || !whatsappPermissionGranted}
                    className="flex-1 h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-2 shadow-xs"
                  >
                    <span>
                      {submitting ? "Creating Private Space..." : "Authorize & Enter Private Space"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            )}
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex justify-center border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Already have a private account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary-700 underline underline-offset-4"
              >
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Privacy Assurance */}
        <div className="p-3 rounded-xl border border-border/60 bg-white/70 dark:bg-card/60 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Private &amp; Isolated Student Workspace</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your assignments, quizzes, WhatsApp group extractions, uploaded materials, and AI chats are strictly scoped
            to your authenticated student ID and never shared with other users.
          </p>
        </div>
      </div>
    </div>
  )
}
