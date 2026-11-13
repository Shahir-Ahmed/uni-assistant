"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  GraduationCap,
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

function SignupPageInner() {
  const { register, isLoading } = useAuth()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get("next")
  const redirectTo = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  // Multi-step onboarding state
  const [step, setStep] = React.useState<1 | 2>(1)

  // Step 1: Private Student Account
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [semester, setSemester] = React.useState("Fall 2026")
  const [major, setMajor] = React.useState("Computer Science")

  // Step 2: WhatsApp Integration Permission & Pairing
  const [whatsappPermissionGranted, setWhatsappPermissionGranted] = React.useState(false)
  const [whatsappPhone, setWhatsappPhone] = React.useState("")
  const [linkMode, setLinkMode] = React.useState<"QR" | "CODE" | "LATER">("QR")
  const [whatsappPaired, setWhatsappPaired] = React.useState(false)
  const [autoSyncAssignments, setAutoSyncAssignments] = React.useState(true)
  const [autoSyncQuizzes, setAutoSyncQuizzes] = React.useState(true)
  const [autoSyncNotes, setAutoSyncNotes] = React.useState(true)
  const [filterChitChat, setFilterChitChat] = React.useState(true)

  // Live QR & Pairing Code state
  const [sessionToken, setSessionToken] = React.useState("2@scholaros-onboarding-auth-2026")
  const [qrCountdown, setQrCountdown] = React.useState(45)
  const [isRefreshingQr, setIsRefreshingQr] = React.useState(false)
  const [pairingCode, setPairingCode] = React.useState("SCHL-4920")
  const [copiedCode, setCopiedCode] = React.useState(false)

  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    setSessionToken(`2@scholaros-signup-${Date.now()}`)
    setPairingCode(`SCHL-${Math.floor(1000 + Math.random() * 9000)}`)
  }, [])

  React.useEffect(() => {
    if (step !== 2 || linkMode !== "QR" || whatsappPaired) return
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          setSessionToken(`2@scholaros-signup-${Date.now()}`)
          return 45
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, linkMode, whatsappPaired])

  const handleRefreshQr = () => {
    setIsRefreshingQr(true)
    setTimeout(() => {
      setSessionToken(`2@scholaros-signup-${Date.now()}`)
      setQrCountdown(45)
      setIsRefreshingQr(false)
    }, 450)
  }

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

    if (linkMode !== "LATER" && whatsappPaired && !whatsappPhone.trim()) {
      setError("Please enter your WhatsApp phone number to complete device linking.")
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
                : "Grant WhatsApp sync permission to securely extract study group quizzes, deadlines, and notes into your private account."}
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
                        <SelectItem value="Data Science & AI">Data Science &amp; AI</SelectItem>
                        <SelectItem value="Information Systems">Info Systems</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={whatsappPermissionGranted}
                      onChange={(e) => setWhatsappPermissionGranted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span>Grant WhatsApp Integration Permission (Required)</span>
                        <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-700 dark:text-emerald-300">
                          Private Access
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        I authorize ScholarOS to connect with my linked WhatsApp study groups and communities to
                        extract academic quizzes, assignments, and lecture notes strictly into my private space.
                        Personal messages and non-academic banter are discarded.
                      </p>
                    </div>
                  </label>
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

                {/* WhatsApp Device Pairing Selector */}
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
                          setWhatsappPaired(false)
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
                          setWhatsappPaired(false)
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
                          setWhatsappPaired(false)
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                          linkMode === "LATER" ? "bg-white dark:bg-card text-emerald-700 shadow-xs" : "text-muted-foreground"
                        }`}
                      >
                        Pair After Signup
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Number Input */}
                  <div className="space-y-1">
                    <Label htmlFor="waPhone" className="text-[11px] font-semibold text-muted-foreground">
                      WhatsApp Phone Number {linkMode === "LATER" ? "(Optional)" : "(For private device verification)"}
                    </Label>
                    <Input
                      id="waPhone"
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="+92 300 1234567 or +1 (555) 482-9103"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {linkMode === "QR" && (
                    <div className="flex flex-col items-center space-y-3 pt-1">
                      {whatsappPaired ? (
                        <div className="w-full p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>WhatsApp Session Linked</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setWhatsappPaired(false)}
                            className="text-[11px] text-emerald-700 underline"
                          >
                            Rescan
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <WhatsAppQRCode
                              sessionToken={sessionToken}
                              size={164}
                              isRefreshing={isRefreshingQr}
                            />
                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
                              <Clock className="h-2.5 w-2.5 text-emerald-400" />
                              <span>{qrCountdown}s</span>
                              <button
                                type="button"
                                onClick={handleRefreshQr}
                                disabled={isRefreshingQr}
                                className="ml-1 text-emerald-400 hover:text-emerald-300"
                                title="Refresh QR"
                              >
                                <RefreshCw className={`h-2.5 w-2.5 ${isRefreshingQr ? "animate-spin" : ""}`} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground text-center pt-1">
                            WhatsApp &rarr; Linked Devices &rarr; Link a Device, then scan above.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setWhatsappPaired(true)}
                            className="h-8 text-xs font-semibold border-emerald-500/50 text-emerald-700 dark:text-emerald-300 gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>I&apos;ve Scanned the QR Code</span>
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {linkMode === "CODE" && (
                    <div className="space-y-2.5 text-center">
                      <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          8-Character Pairing Code
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
                            <span>{copiedCode ? "Copied" : "Copy"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant={whatsappPaired ? "default" : "outline"}
                            size="sm"
                            onClick={() => setWhatsappPaired(!whatsappPaired)}
                            className={`h-7 text-[11px] gap-1 ${
                              whatsappPaired ? "bg-emerald-600 text-white" : "border-emerald-500/50 text-emerald-700"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{whatsappPaired ? "Code Verified" : "Confirm Linked"}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {linkMode === "LATER" && (
                    <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg">
                      Permission will be saved to your private profile now. You can scan the QR code anytime from the{" "}
                      <strong>WhatsApp Sync</strong> tab inside your workspace.
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

export default function SignupPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-xs text-muted-foreground">
          Loading registration...
        </div>
      }
    >
      <SignupPageInner />
    </React.Suspense>
  )
}
