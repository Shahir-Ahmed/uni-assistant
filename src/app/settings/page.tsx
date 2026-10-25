"use client"

import * as React from "react"
import {
  Settings,
  Bot,
  Database,
  Download,
  Upload,
  Shield,
  Key,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { academicService } from "@/lib/academic-service"

export default function SettingsPage() {
  const [provider, setProvider] = React.useState("local")
  const [modelName, setModelName] = React.useState("gpt-4o-mini")
  const [localEndpoint, setLocalEndpoint] = React.useState("http://localhost:11434/v1")
  const [apiKey, setApiKey] = React.useState("")
  const [offlineOnly, setOfflineOnly] = React.useState(true)
  const [statusMessage, setStatusMessage] = React.useState("")

  const handleExportBackup = () => {
    const jsonStr = academicService.exportFullBackup()
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scholaros-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setStatusMessage("Full JSON backup exported successfully.")
    setTimeout(() => setStatusMessage(""), 4000)
  }

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const result = academicService.importFullBackup(text)
        if (result.success) {
          setStatusMessage("Academic library restored successfully!")
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          alert(result.message)
        }
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <span>System Settings & Data Safety</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure AI reasoning providers, local model endpoints, privacy controls, and full JSON backups
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl text-xs font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* AI Provider Configuration Card */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span>AI Reasoning Provider</span>
              </CardTitle>
              <CardDescription className="text-xs">
                ScholarOS works with local inference (Ollama, LM Studio), remote providers, or 100% offline rule-based mode.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[11px] font-bold">
              {offlineOnly ? "Offline-First Mode" : "Online Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Active AI Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Model Endpoint (Ollama / LocalAI)</SelectItem>
                  <SelectItem value="openai">OpenAI API (Cloud)</SelectItem>
                  <SelectItem value="gemini">Google Gemini API (Cloud)</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude (Cloud)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Model Identifier</Label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. gpt-4o-mini or llama3"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {provider === "local" ? (
            <div>
              <Label className="text-xs font-semibold">Local Inference Base URL</Label>
              <Input
                value={localEndpoint}
                onChange={(e) => setLocalEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="mt-1 text-xs"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Compatible with Ollama, LM Studio, or vLLM running on your local machine with no external network transmission.
              </span>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold">API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="mt-1 text-xs"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Keys are stored securely in memory or server environment variables and never exposed to the client bundle.
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-border">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">Strict Offline Mode</span>
              <p className="text-[11px] text-muted-foreground">
                Never transmit academic notes or assignments to any cloud API.
              </p>
            </div>
            <Switch checked={offlineOnly} onCheckedChange={setOfflineOnly} />
          </div>
        </CardContent>
      </Card>

      {/* Backup and Restoration Card */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <span>Data Safety, Portability & Backups</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Export a full JSON backup of all your subjects, assignments, deadlines, audit history, and notes to your PC.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-gray-50/50 dark:bg-card/50 space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Export Backup</h4>
                <p className="text-xs text-muted-foreground">
                  Downloads an exact portable snapshot of your academic library.
                </p>
              </div>
              <Button
                onClick={handleExportBackup}
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Export JSON Backup</span>
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-gray-50/50 dark:bg-card/50 space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Restore Backup</h4>
                <p className="text-xs text-muted-foreground">
                  Upload a previously exported JSON backup to recover records.
                </p>
              </div>
              <label className="cursor-pointer">
                <div className="inline-flex items-center justify-center w-full h-9 rounded-md border border-input bg-transparent text-xs font-semibold hover:bg-accent gap-2">
                  <Upload className="h-4 w-4" />
                  <span>Select JSON File</span>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
