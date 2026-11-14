"use client"

import * as React from "react"
import Link from "next/link"
import {
  MessageCircle,
  QrCode,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CheckSquare,
  FileText,
  Sparkles,
  RefreshCw,
  Sliders,
  Plus,
  ArrowRight,
  Clock,
  Trash2,
  Copy,
  Check,
  Zap,
  Users,
  Radio,
  UploadCloud,
  ChevronRight,
  Filter,
  Smartphone,
  KeyRound,
  Link as LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { academicService } from "@/lib/academic-service"
import { Subject } from "@/types"
import {
  WhatsAppSyncConfig,
  WhatsAppGroupConfig,
  ExtractionResult,
  DEFAULT_WHATSAPP_CONFIG,
  SIMULATION_SCENARIOS,
} from "@/lib/whatsapp-shared"
import { WhatsAppQRCode } from "@/components/whatsapp/WhatsAppQRCode"

interface LiveMessageItem {
  id: string
  groupName: string
  sender: string
  text: string
  timestamp: string
  extraction?: ExtractionResult
  synced: boolean
}

export default function WhatsAppIntegrationPage() {
  const [activeTab, setActiveTab] = React.useState<"live" | "import" | "groups" | "connect">("live")
  const [config, setConfig] = React.useState<WhatsAppSyncConfig>(DEFAULT_WHATSAPP_CONFIG)
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)

  // Live Feed State (isolated per authenticated student)
  const [liveMessages, setLiveMessages] = React.useState<LiveMessageItem[]>([])

  // Filter Group in Feed
  const [selectedGroupFilter, setSelectedGroupFilter] = React.useState<string>("ALL")

  // Selected Extraction for Detailed Modal
  const [inspectModalOpen, setInspectModalOpen] = React.useState(false)
  const [inspectedMessage, setInspectedMessage] = React.useState<LiveMessageItem | null>(null)

  // Direct Chat Transcript / Paste State
  const [transcriptText, setTranscriptText] = React.useState("")
  const [transcriptGroupName, setTranscriptGroupName] = React.useState("CS-301 Operating Systems (CR Group)")
  const [batchResults, setBatchResults] = React.useState<any[]>([])
  const [isAnalyzingTranscript, setIsAnalyzingTranscript] = React.useState(false)

  // QR Pairing Modal & Live Baileys Session State
  const [qrModalOpen, setQrModalOpen] = React.useState(false)
  const [pairingMode, setPairingMode] = React.useState<"QR" | "PHONE">("QR")
  const [pairingStep, setPairingStep] = React.useState<"SCAN" | "SUCCESS">("SCAN")
  const [phoneInput, setPhoneInput] = React.useState("")
  const [pairingCode, setPairingCode] = React.useState<string | null>(null)
  const [isRequestingCode, setIsRequestingCode] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState(false)
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [qrString, setQrString] = React.useState<string | null>(null)
  const [waVersion, setWaVersion] = React.useState<string | null>(null)
  const [waSessionError, setWaSessionError] = React.useState<string | null>(null)
  const [qrCountdown, setQrCountdown] = React.useState(45)
  const [isRefreshingQr, setIsRefreshingQr] = React.useState(false)
  const [copiedWebhook, setCopiedWebhook] = React.useState(false)
  const [webhookUrl, setWebhookUrl] = React.useState("/api/whatsapp/webhook")

  const [isSyncingCommunities, setIsSyncingCommunities] = React.useState(false)
  const [showWebhookToken, setShowWebhookToken] = React.useState(false)
  const [isRotatingToken, setIsRotatingToken] = React.useState(false)

  const getAuthHeaders = React.useCallback((withJson = true): Record<string, string> => {
    const headers: Record<string, string> = withJson ? { "Content-Type": "application/json" } : {}
    if (typeof window !== "undefined") {
      try {
        const token = sessionStorage.getItem("scholaros_auth_token") || ""
        if (token) headers.Authorization = `Bearer ${token}`
      } catch {
        // ignore
      }
    }
    return headers
  }, [])

  React.useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`)
  }, [])

  // Add Group Modal State
  const [addGroupModalOpen, setAddGroupModalOpen] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")
  const [newGroupSubject, setNewGroupSubject] = React.useState("")
  const [groupInviteUrl, setGroupInviteUrl] = React.useState("")

  const fetchConfig = React.useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/config", {
        credentials: "include",
        headers: getAuthHeaders(false),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConfig(data.config)
          if (data.config.pairedPhone) {
            setPhoneInput(data.config.pairedPhone)
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load WhatsApp config:", e)
    }
  }, [getAuthHeaders])

  const startLiveSession = React.useCallback(
    async (mode: "QR" | "CODE", forceFresh = false) => {
      setWaSessionError(null)
      if (mode === "QR") {
        setIsRefreshingQr(true)
      } else {
        setIsRequestingCode(true)
      }

      try {
        const res = await fetch("/api/whatsapp/session", {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            action: forceFresh ? "refresh" : "start",
            mode,
            phoneNumber: phoneInput,
            forceFresh,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setWaSessionError(data.error || "Unable to connect to WhatsApp servers.")
          return
        }

        const sess = data.session
        if (sess) {
          if (sess.waVersion) setWaVersion(sess.waVersion)
          if (sess.qrDataUrl) setQrDataUrl(sess.qrDataUrl)
          if (sess.qrString) setQrString(sess.qrString)
          if (sess.pairingCode) setPairingCode(sess.pairingCode)
          if (sess.lastError) setWaSessionError(sess.lastError)
          if (sess.qrGeneratedAt) setQrCountdown(45)

          if (sess.status === "CONNECTED") {
            setPairingStep("SUCCESS")
            if (sess.phoneNumber) setPhoneInput(sess.phoneNumber)
            await fetchConfig()
          }
        }
      } catch (err: any) {
        setWaSessionError(err?.message || "Failed to reach WhatsApp session service.")
      } finally {
        setIsRefreshingQr(false)
        setIsRequestingCode(false)
      }
    },
    [phoneInput, getAuthHeaders, fetchConfig]
  )

  const handleSyncCommunities = async () => {
    setIsSyncingCommunities(true)
    try {
      const res = await fetch("/api/whatsapp/session", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ action: "sync" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatusMessage(data.error || "Link WhatsApp first to sync live university communities.")
        setTimeout(() => setStatusMessage(null), 4000)
        return
      }
      await fetchConfig()
      const list = await academicService.getAnnouncements()
      const waItems = list
        .filter((a) => (a.source || "").toLowerCase().includes("whatsapp"))
        .map((a) => ({
          id: a.id,
          groupName: a.sourceGroup || "WhatsApp Study Group",
          sender: (a.extractedData as any)?.sender || a.source || "WhatsApp Contact",
          text: a.originalMessage,
          timestamp: new Date(a.dateReceived || a.createdAt).toLocaleString(),
          synced: Boolean(a.isProcessed),
          extraction: (a.extractedData as unknown as ExtractionResult) || undefined,
        }))
      setLiveMessages(waItems)

      const summary = data.session?.lastSyncSummary
      setStatusMessage(
        summary
          ? `Synced ${data.session.groups?.length || 0} communities/groups — scanned ${summary.scanned} recent messages, imported ${summary.imported} new academic items.`
          : `Refreshed ${data.session?.groups?.length || 0} connected WhatsApp communities & groups.`
      )
      setTimeout(() => setStatusMessage(null), 5000)
    } catch (err: any) {
      setStatusMessage(err?.message || "Failed to sync communities.")
      setTimeout(() => setStatusMessage(null), 4000)
    } finally {
      setIsSyncingCommunities(false)
    }
  }

  const handleRotateWebhookToken = async () => {
    setIsRotatingToken(true)
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ action: "regenerate_webhook_token" }),
      })
      const data = await res.json()
      if (res.ok && data.config) {
        setConfig(data.config)
        setStatusMessage("Rotated private webhook verify token securely.")
        setTimeout(() => setStatusMessage(null), 3500)
      }
    } catch (err) {
      console.error("Failed to rotate webhook token:", err)
    } finally {
      setIsRotatingToken(false)
    }
  }

  const handleDisconnectSession = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/whatsapp/session", {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(false),
      })
      setQrDataUrl(null)
      setQrString(null)
      setPairingCode(null)
      await fetchConfig()
      setStatusMessage("WhatsApp device session unlinked and cleared securely.")
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      console.error("Failed to disconnect WhatsApp:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Start live QR handshake automatically when modal opens in QR mode
  React.useEffect(() => {
    if (qrModalOpen && pairingStep === "SCAN" && pairingMode === "QR" && !qrDataUrl) {
      startLiveSession("QR", false)
    }
  }, [qrModalOpen, pairingStep, pairingMode, qrDataUrl, startLiveSession])

  // Poll live Baileys session every 2.5s while pairing modal is open
  React.useEffect(() => {
    if (!qrModalOpen || pairingStep !== "SCAN") return

    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/session", {
          credentials: "include",
          headers: getAuthHeaders(false),
        })
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
        if (sess.lastError) setWaSessionError(sess.lastError)

        if (sess.status === "CONNECTED") {
          setPairingStep("SUCCESS")
          if (sess.phoneNumber) setPhoneInput(sess.phoneNumber)
          await fetchConfig()
        }
      } catch {
        // ignore transient poll error
      }
    }, 2500)

    return () => clearInterval(poll)
  }, [qrModalOpen, pairingStep, qrString, getAuthHeaders, fetchConfig])

  // Live QR Code Countdown Timer
  React.useEffect(() => {
    if (!qrModalOpen || pairingStep !== "SCAN" || pairingMode !== "QR" || !qrDataUrl) return

    const interval = setInterval(() => {
      setQrCountdown((prev) => (prev > 1 ? prev - 1 : 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [qrModalOpen, pairingStep, pairingMode, qrDataUrl])

  const handleRefreshQr = () => {
    startLiveSession("QR", true)
  }

  // Load config, subjects, and student's own WhatsApp announcements on mount

  React.useEffect(() => {
    fetchConfig()
    academicService.getSubjects().then((res) => setSubjects(res)).catch(console.error)
    academicService
      .getAnnouncements()
      .then((list) => {
        const waItems = list
          .filter((a) => (a.source || "").toLowerCase().includes("whatsapp"))
          .map((a) => ({
            id: a.id,
            groupName: a.sourceGroup || "WhatsApp Study Group",
            sender: a.source || "WhatsApp Contact",
            text: a.originalMessage,
            timestamp: new Date(a.dateReceived || a.createdAt).toLocaleString(),
            synced: Boolean(a.isProcessed),
            extraction: (a.extractedData as unknown as ExtractionResult) || undefined,
          }))
        setLiveMessages(waItems)
      })
      .catch(console.error)
  }, [fetchConfig])

  const saveConfig = async (newConfig: WhatsAppSyncConfig) => {
    setConfig(newConfig)
    try {
      await fetch("/api/whatsapp/config", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ config: newConfig }),
      })
      setStatusMessage("WhatsApp automation settings updated successfully.")
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (e) {
      console.error("Failed to save config:", e)
    }
  }

  // Trigger Realistic Simulation
  const handleSimulateMessage = async (scenarioId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ scenarioId, autoCommit: true }),
      })

      const data = await res.json()
      if (data.success) {
        const newMessage: LiveMessageItem = {
          id: `sim-${Date.now()}`,
          groupName: data.scenario.groupName,
          sender: data.scenario.sender,
          text: data.scenario.text,
          timestamp: "Just now",
          extraction: data.extraction,
          synced: data.synced,
        }

        setLiveMessages((prev) => [newMessage, ...prev])

        setStatusMessage(
          data.synced
            ? `Extracted & Saved: "${data.extraction.title}" added to your academic records!`
            : `AI Analyzed: Classified as ${data.extraction.classification} (${data.extraction.reasoning})`
        )
        setTimeout(() => setStatusMessage(null), 4500)
      }
    } catch (err) {
      console.error("Simulation error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Analyze Past Chat Transcript
  const handleAnalyzeTranscript = async () => {
    if (!transcriptText.trim()) return
    setIsAnalyzingTranscript(true)
    try {
      const lines = transcriptText
        .split(/\n(?=\[|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2})/g)
        .map((l) => l.trim())
        .filter((l) => l.length > 10)
        .slice(0, 10)

      const res = await fetch("/api/whatsapp/extract", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          groupName: transcriptGroupName,
          messages: lines.length > 0 ? lines : [transcriptText],
        }),
      })

      const data = await res.json()
      if (data.results) {
        setBatchResults(data.results)
      }
    } catch (e) {
      console.error("Transcript analysis error:", e)
    } finally {
      setIsAnalyzingTranscript(false)
    }
  }

  // Commit Extracted Item from Transcript
  const handleSyncBatchItem = async (item: any) => {
    try {
      const res = await fetch("/api/whatsapp/sync", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          text: item.rawMessage,
          groupName: transcriptGroupName,
          extraction: item.extraction,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setStatusMessage(
          data.duplicate
            ? `Skipped duplicate: "${item.extraction.title}" was already saved.`
            : `Organized: "${item.extraction.title}" committed to database!`
        )
        setTimeout(() => setStatusMessage(null), 3000)
      }
    } catch (e) {
      console.error("Batch sync error:", e)
    }
  }

  // Filter messages based on active group pill
  const filteredMessages = liveMessages.filter((m) => {
    if (selectedGroupFilter === "ALL") return true
    return m.groupName.includes(selectedGroupFilter)
  })

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-6 sm:p-8 shadow-lg border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                WhatsApp Community Intelligence
              </span>
              <Badge variant="outline" className="border-emerald-400/40 text-emerald-200 text-xs">
                AI Extraction Active (Gemini)
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              WhatsApp Community & Study Groups Hub
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Connect directly to university class groups, CR broadcast channels, and study circles. ScholarOS
              intelligently extracts quizzes, assignment deadlines, and lecture notes while automatically filtering out
              casual chit-chat.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              onClick={() => {
                setPairingStep("SCAN")
                setQrModalOpen(true)
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold shadow-md gap-2 h-11 px-5 rounded-xl transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span>{config.status === "CONNECTED" ? "Device Paired" : "Link WhatsApp Session"}</span>
            </Button>
            <Button
              variant="outline"
              disabled={isSyncingCommunities}
              onClick={handleSyncCommunities}
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-medium h-11 px-4 rounded-xl gap-2"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-300 ${isSyncingCommunities ? "animate-spin" : ""}`} />
              <span>{isSyncingCommunities ? "Syncing..." : "Sync Communities"}</span>
            </Button>
          </div>
        </div>

        {/* Live Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-800/60 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{config.groups.length} Groups</div>
              <div className="text-emerald-200/70 text-[11px]">Communities &amp; Circles</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {liveMessages.filter((m) => m.extraction?.classification === "QUIZ" || m.extraction?.classification === "EXAM").length} Quizzes &amp; Exams
              </div>
              <div className="text-emerald-200/70 text-[11px]">Auto-Scheduled</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {liveMessages.filter((m) => m.extraction?.classification === "ASSIGNMENT").length} Assignments
              </div>
              <div className="text-emerald-200/70 text-[11px]">Deadlines Filed</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {liveMessages.filter((m) => m.extraction?.classification === "NOTE").length} Study Notes
              </div>
              <div className="text-emerald-200/70 text-[11px]">Guides Extracted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("live")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "live"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>Live Community Stream</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("import")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "import"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>Exported Chat Importer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "groups"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Tracked Groups & Rules ({config.groups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("connect")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "connect"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Meta Webhook & Cloud Setup</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* ── TAB 1: LIVE COMMUNITY STREAM & SIMULATOR ── */}
      {activeTab === "live" && (
        <div className="space-y-6">
          {/* Simulation & Quick-Test Toolbar */}
          <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 dark:from-card dark:to-card shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span>Real-Time WhatsApp Group Simulator</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Simulate real student and CR broadcasts to verify AI extraction and automatic database organization.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-bold w-fit">
                  Instant Database Commit
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {SIMULATION_SCENARIOS.map((s) => (
                  <Button
                    key={s.id}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleSimulateMessage(s.id)}
                    className="justify-start text-xs h-auto py-2.5 px-3 bg-white dark:bg-card hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 text-left flex flex-col items-start gap-1 transition-all"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold truncate text-[11px] text-gray-900 dark:text-gray-100">
                        {s.badgeLabel}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {s.expectedType}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{s.text}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Group Filter Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                <span>Group Filter:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedGroupFilter === "ALL"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All Community Groups ({liveMessages.length})
              </button>
              {config.groups.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setSelectedGroupFilter(grp.name.slice(0, 6))}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    selectedGroupFilter === grp.name.slice(0, 6)
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {grp.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground">
              Auto-sync: <strong className="text-emerald-600">Active</strong>
            </span>
          </div>

          {/* Messages Stream */}
          <div className="space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="p-12 text-center border border-dashed rounded-2xl bg-muted/20">
                <MessageCircle className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No incoming messages found for this group</p>
                <p className="text-xs text-muted-foreground mt-1">Click any simulation button above to send a test broadcast.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const ext = msg.extraction
                const isQuiz = ext?.classification === "QUIZ"
                const isAssignment = ext?.classification === "ASSIGNMENT"
                const isNote = ext?.classification === "NOTE"
                const isChitChat = ext?.classification === "CHIT_CHAT"

                return (
                  <Card
                    key={msg.id}
                    className={`border transition-all hover:shadow-sm ${
                      isQuiz
                        ? "border-amber-300/80 bg-gradient-to-r from-amber-50/30 via-card to-card"
                        : isAssignment
                        ? "border-blue-300/80 bg-gradient-to-r from-blue-50/30 via-card to-card"
                        : isNote
                        ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/30 via-card to-card"
                        : "border-border"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Sender & Group Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{msg.sender}</span>
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              {msg.groupName}
                            </Badge>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{msg.timestamp}</span>
                            </span>
                          </div>

                          {/* Raw WhatsApp Message Body */}
                          <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-muted/40 border border-border/60 text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-sans">
                            &ldquo;{msg.text}&rdquo;
                          </div>

                          {/* AI Extraction Banner */}
                          {ext && (
                            <div className="mt-3 pt-3 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>{ext.title}</span>
                                </span>

                                <Badge
                                  className={`text-[10px] font-bold uppercase ${
                                    isQuiz
                                      ? "bg-amber-500 text-white"
                                      : isAssignment
                                      ? "bg-blue-600 text-white"
                                      : isNote
                                      ? "bg-emerald-600 text-white"
                                      : "bg-gray-500 text-white"
                                  }`}
                                >
                                  {ext.classification}
                                </Badge>

                                {ext.subjectCode && (
                                  <Badge variant="outline" className="text-[10px] font-semibold border-primary/40 text-primary">
                                    {ext.subjectCode}
                                  </Badge>
                                )}

                                {ext.confidence && (
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                    {Math.round(ext.confidence * 100)}% AI Confidence
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setInspectedMessage(msg)
                                    setInspectModalOpen(true)
                                  }}
                                  className="h-7 text-xs font-semibold gap-1 text-primary hover:text-primary"
                                >
                                  <span>View Extracted Details</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Button>

                                {msg.synced && (
                                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Saved to App</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: EXPORTED CHAT TRANSCRIPT IMPORTER ── */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-emerald-600" />
                <span>Bulk WhatsApp Chat Transcript Importer</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Export any WhatsApp chat without media (WhatsApp &gt; Group Info &gt; Export Chat), then paste or drop the text below.
                ScholarOS scans all messages, filters out banter, and organizes buried quizzes, tasks, and notes into your dashboard!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Assign to WhatsApp Group</Label>
                  <Select value={transcriptGroupName} onValueChange={setTranscriptGroupName}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.groups.map((grp) => (
                        <SelectItem key={grp.id} value={grp.name}>
                          {grp.name} ({grp.subjectCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Quick Sample Transcripts</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTranscriptText(
                          `[11/12/26, 09:15 AM] Sarah CR: Guys please note, Dr. Aris announced Quiz 2 for CS-301 next Thursday at 10:15 AM in Lab 3. Syllabus: Virtual Memory and Pointers.\n[11/12/26, 09:20 AM] Alex: lol okay thanks\n[11/12/26, 09:30 AM] TA David: Operating Systems Assignment 3 is live. Deadline is Friday Nov 27 at 11:59 PM. Submit on Classroom.\n[11/12/26, 10:02 AM] Mark: bro did anyone finish question 1?\n[11/12/26, 11:45 AM] Prof. Elena: Midterm Cheatsheet for DB: Remember BCNF requires superkey on LHS. ACID properties: Atomicity (WAL), Consistency (Invariants), Isolation (2PL), Durability (Checkpoints).`
                        )
                      }
                      className="text-xs h-9 font-medium"
                    >
                      Load Sample Chat
                    </Button>
                    <label className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium border rounded-md cursor-pointer hover:bg-accent transition-colors">
                      <UploadCloud className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      <span>Upload _chat.txt</span>
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        className="sr-only"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const content = event.target?.result as string
                              if (content) setTranscriptText(content)
                            }
                            reader.readAsText(file)
                          }
                        }}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTranscriptText("")}
                      className="text-xs h-9 text-muted-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Exported WhatsApp Messages (.txt)</Label>
                <Textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste WhatsApp exported chat text here or click 'Upload _chat.txt'... e.g. [11/12/26, 09:30 AM] Sarah: Quiz announced for Thursday..."
                  rows={8}
                  className="mt-1 text-xs font-mono bg-gray-50/50 dark:bg-card border-border"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  AI will discard chit-chat &amp; keep only academic events, quizzes, and tasks.
                </span>
                <Button
                  onClick={handleAnalyzeTranscript}
                  disabled={!transcriptText.trim() || isAnalyzingTranscript}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 rounded-xl h-10 px-5"
                >
                  {isAnalyzingTranscript ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Extracting with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Extract Academic Items</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Batch Results Grid */}
          {batchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Extracted Items from Transcript ({batchResults.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batchResults.map((item, idx) => {
                  const ext: ExtractionResult = item.extraction
                  const isIgnored = ext.classification === "CHIT_CHAT"

                  return (
                    <Card
                      key={idx}
                      className={`border ${
                        isIgnored ? "border-dashed border-gray-300 dark:border-gray-800 opacity-60" : "border-emerald-300 dark:border-emerald-800"
                      }`}
                    >
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <Badge
                            className={
                              isIgnored
                                ? "bg-gray-400 text-white"
                                : ext.classification === "QUIZ"
                                ? "bg-amber-500 text-white"
                                : ext.classification === "ASSIGNMENT"
                                ? "bg-blue-600 text-white"
                                : "bg-emerald-600 text-white"
                            }
                          >
                            {ext.classification}
                          </Badge>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {Math.round((ext.confidence || 0.9) * 100)}% Confidence
                          </span>
                        </div>

                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{ext.title}</div>
                        <p className="text-muted-foreground line-clamp-2">{ext.description || item.rawMessage}</p>

                        {ext.deadline && (
                          <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Deadline: {new Date(ext.deadline).toLocaleDateString()}</span>
                          </div>
                        )}

                        {ext.eventDate && (
                          <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Date: {new Date(ext.eventDate).toLocaleDateString()}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground italic">{ext.reasoning}</span>
                          {!isIgnored && (
                            <Button
                              size="sm"
                              onClick={() => handleSyncBatchItem(item)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <span>Save to App</span>
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TRACKED GROUPS & AUTOMATION RULES ── */}
      {activeTab === "groups" && (
        <div className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <span>Configured Study Groups &amp; Course Mapping</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  ScholarOS monitors these WhatsApp groups and automatically classifies items into their respective academic subjects.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSyncingCommunities}
                  onClick={handleSyncCommunities}
                  className="text-xs font-semibold gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingCommunities ? "animate-spin" : ""}`} />
                  <span>Sync Live Communities</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddGroupModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Track New Group</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {config.groups.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">No WhatsApp communities or study groups linked yet.</p>
                    <p>Scan your WhatsApp QR code to automatically discover your university communities and sub-groups, or add one manually.</p>
                  </div>
                ) : (
                  config.groups.map((group) => (
                    <div key={group.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                          style={{ backgroundColor: group.color || "#059669" }}
                        >
                          {group.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
                            <span className="truncate">{group.name}</span>
                            <Badge variant="outline" className="text-[10px] font-bold border-primary/40 text-primary">
                              {group.subjectCode || "GENERAL"}
                            </Badge>
                            {group.kind === "COMMUNITY" && (
                              <Badge className="text-[10px] font-bold bg-teal-600 text-white">Community</Badge>
                            )}
                            {group.kind === "COMMUNITY_ANNOUNCEMENTS" && (
                              <Badge className="text-[10px] font-bold bg-amber-600 text-white">Announcements</Badge>
                            )}
                            {group.kind === "SUBGROUP" && (
                              <Badge variant="secondary" className="text-[10px] font-semibold">
                                Sub-Group{group.linkedParentName ? `: ${group.linkedParentName}` : ""}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                            <span>{group.messageCount} academic items extracted</span>
                            {group.participantsCount ? (
                              <>
                                <span>•</span>
                                <span>{group.participantsCount} members</span>
                              </>
                            ) : null}
                            <span>•</span>
                            <span>Last active {group.lastActive}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`sync-${group.id}`} className="text-xs text-muted-foreground font-medium">
                            Auto-Sync
                          </Label>
                          <Switch
                            id={`sync-${group.id}`}
                            checked={group.autoSync}
                            onCheckedChange={(checked) => {
                              const updated = config.groups.map((g) =>
                                g.id === group.id ? { ...g, autoSync: checked } : g
                              )
                              saveConfig({ ...config, groups: updated })
                            }}
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = config.groups.filter((g) => g.id !== group.id)
                            saveConfig({ ...config, groups: updated })
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Global Automation Preferences */}
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <span>Automated Extraction Rules</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Strictly enforced on incoming community broadcasts and study group syncs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">Auto-Add Assignments to Dashboard</div>
                  <div className="text-[11px] text-muted-foreground">
                    Automatically create pending assignments with extracted deadlines in your coursework list.
                  </div>
                </div>
                <Switch
                  checked={config.autoSyncAssignments}
                  onCheckedChange={(v) => saveConfig({ ...config, autoSyncAssignments: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">Auto-Add Quizzes &amp; Midterms to Calendar</div>
                  <div className="text-[11px] text-muted-foreground">
                    Insert newly announced quizzes and exam dates straight into your academic timetable.
                  </div>
                </div>
                <Switch
                  checked={config.autoSyncQuizzes}
                  onCheckedChange={(v) => saveConfig({ ...config, autoSyncQuizzes: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">Auto-Save Study Notes &amp; Lecture Materials</div>
                  <div className="text-[11px] text-muted-foreground">
                    Archive cheatsheets, formula guides, and shared slide notes from your groups into Study Notes.
                  </div>
                </div>
                <Switch
                  checked={config.autoSyncNotes}
                  onCheckedChange={(v) => saveConfig({ ...config, autoSyncNotes: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">Intelligent Chit-Chat Filter</div>
                  <div className="text-[11px] text-muted-foreground">
                    Discard casual banter (&ldquo;lol&rdquo;, &ldquo;thx&rdquo;, memes, stickers) and ignore personal 1-on-1 DMs.
                  </div>
                </div>
                <Switch
                  checked={config.filterChitChat}
                  onCheckedChange={(v) => saveConfig({ ...config, filterChitChat: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 4: META WEBHOOK & CONNECTION SETUP ── */}
      {activeTab === "connect" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Direct Webhook Connection */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Radio className="h-5 w-5 text-emerald-600" />
                  <span>Meta WhatsApp Cloud API Webhook</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Authenticated with cryptographic token verification and optional X-Hub-Signature-256 HMAC validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold">Webhook Callback URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="font-mono text-xs bg-muted/50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl)
                        setCopiedWebhook(true)
                        setTimeout(() => setCopiedWebhook(false), 2000)
                      }}
                      className="text-xs shrink-0"
                    >
                      {copiedWebhook ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Private Verify Token</Label>
                    <button
                      type="button"
                      onClick={() => setShowWebhookToken((prev) => !prev)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {showWebhookToken ? "Hide Token" : "Reveal Token"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      type={showWebhookToken ? "text" : "password"}
                      value={config.webhookVerifyToken || ""}
                      className="font-mono text-xs bg-muted/50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!config.webhookVerifyToken}
                      onClick={() => {
                        if (config.webhookVerifyToken) {
                          navigator.clipboard.writeText(config.webhookVerifyToken)
                          setStatusMessage("Copied private webhook token to clipboard.")
                          setTimeout(() => setStatusMessage(null), 2000)
                        }
                      }}
                      className="text-xs shrink-0"
                      title="Copy verify token"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRotatingToken}
                      onClick={handleRotateWebhookToken}
                      className="text-xs shrink-0"
                      title="Rotate webhook secret token"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRotatingToken ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Unique 256-bit secret scoped only to your student account. Rotate anytime if exposed.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Real-Time Cloud Synchronization</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Whenever an instructor or Class Representative sends a message in any linked community group, Meta forwards the event payload to this endpoint for instant extraction.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Linked Phone & Session */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>Linked Student WhatsApp Device</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Status of student device session pairing with ScholarOS Academic Intelligence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center font-bold">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {config.pairedPhone || "Not paired yet"}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            config.status === "CONNECTED" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        ></span>
                        <span>
                          {config.status === "CONNECTED"
                            ? `Active Session • Paired with ${config.groups.length} Study Groups`
                            : "Permission Granted • Scan QR to Link Device"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      config.status === "CONNECTED"
                        ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                        : "border-amber-500 text-amber-700 bg-amber-50"
                    }
                  >
                    {config.status === "CONNECTED" ? "Connected" : "Awaiting QR"}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Integration Permission</span>
                  </span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-300 text-[10px]">
                    {config.permissionGranted ? "Authorized" : "Granted"}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => {
                      setPairingStep("SCAN")
                      setQrDataUrl(null)
                      setQrModalOpen(true)
                    }}
                    variant="outline"
                    className="flex-1 text-xs font-semibold gap-2 h-10"
                  >
                    <QrCode className="h-4 w-4 text-emerald-600" />
                    <span>{config.status === "CONNECTED" ? "Link Another / Re-Scan QR" : "Scan Official QR Code"}</span>
                  </Button>
                  {config.status === "CONNECTED" && (
                    <Button
                      onClick={handleDisconnectSession}
                      variant="outline"
                      disabled={isLoading}
                      className="text-xs font-semibold text-destructive border-destructive/40 hover:bg-destructive/10 h-10"
                    >
                      Unlink Device
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── MODAL 1: QR CODE SESSION PAIRING ── */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <QrCode className="h-5 w-5" />
                <span>Link WhatsApp Academic Community</span>
              </DialogTitle>
              {pairingStep === "SCAN" && (
                <div className="flex rounded-lg border border-border p-0.5 bg-muted/60">
                  <button
                    type="button"
                    onClick={() => setPairingMode("QR")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
                      pairingMode === "QR"
                        ? "bg-white dark:bg-card text-emerald-700 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <QrCode className="h-3 w-3" />
                    <span>Scan QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairingMode("PHONE")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
                      pairingMode === "PHONE"
                        ? "bg-white dark:bg-card text-emerald-700 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Pairing Code</span>
                  </button>
                </div>
              )}
            </div>
            <DialogDescription className="text-xs">
              Connect ScholarOS to your university and study groups to extract deadlines, quizzes, and notes in real time.
            </DialogDescription>
          </DialogHeader>

          {pairingStep === "SCAN" ? (
            pairingMode === "QR" ? (
              <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
                {waSessionError && (
                  <div className="w-full p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2 text-left">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{waSessionError}</span>
                  </div>
                )}

                {/* Genuine WhatsApp Multi-Device QR Code */}
                <div className="relative">
                  <WhatsAppQRCode
                    qrDataUrl={qrDataUrl}
                    qrString={qrString}
                    waVersion={waVersion}
                    size={220}
                    isRefreshing={isRefreshingQr}
                    error={waSessionError}
                    onRefresh={handleRefreshQr}
                  />

                  {qrDataUrl && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-md border border-gray-700 shrink-0 whitespace-nowrap">
                      <Clock className="h-3 w-3 text-emerald-400" />
                      <span>QR valid ~{qrCountdown}s</span>
                      <button
                        type="button"
                        onClick={handleRefreshQr}
                        disabled={isRefreshingQr}
                        className="ml-1 text-emerald-400 hover:text-emerald-300"
                        title="Refresh QR code"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isRefreshingQr ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 4 Clear Steps */}
                <div className="w-full text-left space-y-2 pt-3 border-t border-border/80 text-xs text-gray-700 dark:text-gray-300">
                  <div className="font-bold text-[11px] text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    How to scan with your phone:
                  </div>
                  <ol className="space-y-1 text-[11px] text-muted-foreground list-decimal list-inside leading-relaxed">
                    <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                    <li>Tap <strong>Menu ⋮</strong> (Android) or <strong>Settings ⚙️</strong> (iPhone)</li>
                    <li>Tap <strong>Linked Devices</strong> and select <strong>Link a Device</strong></li>
                    <li>Point your camera at the authorized QR code above — ScholarOS will auto-connect</li>
                  </ol>
                </div>

                <div className="w-full flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Listening for phone scan...</span>
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshQr}
                    disabled={isRefreshingQr}
                    className="text-xs h-8 gap-1.5"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshingQr ? "animate-spin" : ""}`} />
                    <span>New QR Code</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Official Phone Number & Pairing Code Mode */
              <div className="p-4 space-y-4 text-xs">
                {waSessionError && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{waSessionError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    WhatsApp Phone Number (Include country code, e.g. +923001234567)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+923001234567"
                      className="text-xs h-9 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRequestingCode || !phoneInput.trim()}
                      onClick={() => startLiveSession("CODE", true)}
                      className="text-xs shrink-0 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-semibold"
                    >
                      {isRequestingCode ? "Connecting..." : "Get Official Code"}
                    </Button>
                  </div>
                </div>

                {/* Big Bold Official Code Boxes */}
                {pairingCode ? (
                  <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Official 8-Character WhatsApp Pairing Code
                    </span>

                    <div className="flex items-center justify-center gap-1.5 py-1">
                      {pairingCode.replace("-", "").split("").map((char, idx) => (
                        <React.Fragment key={idx}>
                          {idx === 4 && <span className="text-xl font-bold text-emerald-600 px-1">-</span>}
                          <div className="h-10 w-9 rounded-lg bg-white dark:bg-card border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-mono font-extrabold text-lg flex items-center justify-center shadow-xs">
                            {char}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(pairingCode)
                          setCopiedCode(true)
                          setTimeout(() => setCopiedCode(false), 2000)
                        }}
                        className="h-7 text-xs font-semibold gap-1.5"
                      >
                        {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode ? "Copied to Clipboard!" : "Copy Code"}</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-[11px] text-muted-foreground">
                    Enter your WhatsApp phone number with country code above and click{" "}
                    <strong>Get Official Code</strong> to receive an authorized 8-character pairing code from WhatsApp.
                  </div>
                )}

                <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                  <p>1. Open WhatsApp &rarr; <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong> &rarr; <strong>Link with phone number instead</strong></p>
                  <p>2. Enter the 8-character code above — this dialog updates automatically once linked</p>
                </div>
              </div>
            )
          ) : (
            /* SUCCESS State */
            <div className="p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">WhatsApp Successfully Linked!</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Your student device ({phoneInput || "Verified Device"}) is connected. {config.groups.length} university study groups are mapped and ready to extract quizzes, homework, and study guides into your private workspace.
                </p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border text-xs text-left space-y-1.5">
                <div className="font-bold text-[11px] text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Active Automated Group Monitoring:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                  {config.groups.slice(0, 6).map((g) => (
                    <div key={g.id} className="truncate">• {g.name}</div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setQrModalOpen(false)}
                className="w-full bg-primary text-white text-xs font-semibold h-10"
              >
                Return to Live Community Stream
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: INSPECT EXTRACTED ACADEMIC ITEM ── */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span>Extracted Academic Intelligence</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review how Gemini structured this WhatsApp message into verified university data.
            </DialogDescription>
          </DialogHeader>

          {inspectedMessage?.extraction && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Original WhatsApp Message</span>
                <p className="text-xs text-gray-800 dark:text-gray-200 italic">&ldquo;{inspectedMessage.text}&rdquo;</p>
                <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-2">
                  <span>From: {inspectedMessage.sender}</span>
                  <span>•</span>
                  <span>Group: {inspectedMessage.groupName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-gray-50/50 dark:bg-card">
                  <span className="text-[10px] font-semibold text-muted-foreground">Classification</span>
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                    {inspectedMessage.extraction.classification}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-gray-50/50 dark:bg-card">
                  <span className="text-[10px] font-semibold text-muted-foreground">Associated Course</span>
                  <div className="font-bold text-sm text-primary mt-0.5">
                    {inspectedMessage.extraction.subjectCode || "GENERAL"}
                  </div>
                </div>
              </div>

              {inspectedMessage.extraction.deadline && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Actionable Deadline</span>
                  <div className="font-bold text-sm text-blue-900 dark:text-blue-100 mt-0.5 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(inspectedMessage.extraction.deadline).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {inspectedMessage.extraction.eventDate && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Scheduled Date &amp; Location</span>
                  <div className="font-bold text-sm text-amber-900 dark:text-amber-100 mt-0.5 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(inspectedMessage.extraction.eventDate).toLocaleString()}</span>
                    {inspectedMessage.extraction.location && (
                      <span className="font-normal text-xs text-muted-foreground">
                        ({inspectedMessage.extraction.location})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {inspectedMessage.extraction.topics && inspectedMessage.extraction.topics.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Extracted Syllabus Topics</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedMessage.extraction.topics.map((t, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {inspectedMessage.extraction.noteContent && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Generated Study Note Content</span>
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-mono whitespace-pre-wrap">
                    {inspectedMessage.extraction.noteContent}
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-muted text-[11px] text-muted-foreground italic">
                AI Reasoning: {inspectedMessage.extraction.reasoning}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Permanently Saved to Database</span>
            </span>
            <Button size="sm" onClick={() => setInspectModalOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: TRACK NEW GROUP ── */}
      <Dialog open={addGroupModalOpen} onOpenChange={setAddGroupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5 text-emerald-600" />
              <span>Track New WhatsApp Study Group</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the WhatsApp group title and map it to your academic course.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">WhatsApp Group or Community Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value)
                  // Auto-detect course code if typed
                  if (!newGroupSubject) {
                    const match = e.target.value.match(/(CS|MATH|ENG|PHY|CHEM|BIO|STAT|EE|ME|ECON)[\s-]?\d{3}/i)
                    if (match) {
                      const detected = match[0].toUpperCase().replace(" ", "-")
                      const found = subjects.find(s => s.code?.toUpperCase() === detected)
                      if (found) setNewGroupSubject(found.code || found.name)
                    }
                  }
                }}
                placeholder="e.g. CS-401 Machine Learning Study Group"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>WhatsApp Group Invite Link (Optional)</span>
                <span className="text-[10px] text-muted-foreground font-normal">chat.whatsapp.com/...</span>
              </Label>
              <Input
                value={groupInviteUrl}
                onChange={(e) => setGroupInviteUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/INVITE_TOKEN"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Map to Academic Subject</Label>
              <Select value={newGroupSubject} onValueChange={setNewGroupSubject}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={sub.code || sub.name}>
                      {sub.name} ({sub.code || "Course"})
                    </SelectItem>
                  ))}
                  <SelectItem value="GENERAL">General Course Broadcast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddGroupModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newGroupName.trim()}
              onClick={() => {
                const newGroup: WhatsAppGroupConfig = {
                  id: `grp-${Date.now()}`,
                  name: newGroupName.trim(),
                  subjectCode: newGroupSubject || "GENERAL",
                  autoSync: true,
                  messageCount: 0,
                  lastActive: "Just now",
                  color: "#059669",
                }
                saveConfig({ ...config, groups: [newGroup, ...config.groups] })
                setAddGroupModalOpen(false)
                setNewGroupName("")
                setGroupInviteUrl("")
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
