"use client"

import * as React from "react"
import {
  Upload,
  Link as LinkIcon,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Globe,
  Paperclip,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export interface FileAttachment {
  type: "FILE" | "URL"
  fileName: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
  extractedText?: string
}

export interface UnifiedFileInputProps {
  value?: FileAttachment | null
  onChange: (attachment: FileAttachment | null) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  description?: string
  compact?: boolean
  className?: string
  placeholderUrl?: string
}

export function UnifiedFileInput({
  value,
  onChange,
  accept = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.xls,.xlsx,.png,.jpg,.jpeg",
  maxSizeMB = 50,
  label = "Attach File or Document Link",
  description,
  compact = false,
  className = "",
  placeholderUrl = "https://example.com/lecture-slides.pdf",
}: UnifiedFileInputProps) {
  const [activeTab, setActiveTab] = React.useState<"UPLOAD" | "URL">("UPLOAD")
  const [urlInput, setUrlInput] = React.useState("")
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Sync internal URL state with external value if it's a URL
  React.useEffect(() => {
    if (value && value.type === "URL" && value.fileUrl) {
      setUrlInput(value.fileUrl)
    }
  }, [value])

  const handleFileUpload = async (file: File) => {
    setUploadError(null)

    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File exceeds maximum size of ${maxSizeMB}MB`)
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(errorData.error || `Upload failed with status ${res.status}`)
      }

      const data = await res.json()

      onChange({
        type: "FILE",
        fileName: data.fileName || file.name,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize || file.size,
        mimeType: data.mimeType || file.type,
        extractedText: data.extractedText || "",
      })
    } catch (err: any) {
      console.error("Upload error:", err)
      setUploadError(err.message || "Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setUploadError("Please enter a valid URL")
      return
    }

    setUploadError(null)

    // Parse simple file name from URL
    let derivedName = "Linked Resource"
    try {
      const parsedUrl = new URL(trimmed)
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean)
      if (pathParts.length > 0) {
        derivedName = decodeURIComponent(pathParts[pathParts.length - 1])
      } else {
        derivedName = parsedUrl.hostname
      }
    } catch {
      // not a strict full URL (e.g. university intranet or drive shorthand)
      const parts = trimmed.split("/")
      derivedName = parts[parts.length - 1] || trimmed
    }

    onChange({
      type: "URL",
      fileName: derivedName,
      fileUrl: trimmed,
      mimeType: "text/html",
      extractedText: `[External URL Linked: ${trimmed}]`,
    })
  }

  const handleClear = () => {
    onChange(null)
    setUrlInput("")
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = () => {
    if (!value) return <FileIcon className="h-5 w-5 text-muted-foreground" />
    if (value.type === "URL") return <Globe className="h-5 w-5 text-blue-500" />
    const ext = value.fileName.toLowerCase()
    if (ext.endsWith(".pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (ext.match(/\.(png|jpg|jpeg|gif|webp)$/)) return <ImageIcon className="h-5 w-5 text-emerald-500" />
    return <FileIcon className="h-5 w-5 text-primary" />
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // If a file or URL is already attached, show the active preview card
  if (value) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && <Label className="text-xs font-semibold">{label}</Label>}
        <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 transition-all">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-white dark:bg-card shadow-xs shrink-0">
              {getFileIcon()}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate block max-w-[220px] sm:max-w-xs">
                  {value.fileName}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary uppercase">
                  {value.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 truncate">
                {value.fileSize ? <span>{formatBytes(value.fileSize)}</span> : null}
                {value.fileUrl && (
                  <a
                    href={value.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-primary truncate max-w-[200px]"
                  >
                    {value.fileUrl}
                  </a>
                )}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
            title="Remove attachment"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Compact input (ideal for chatbars or tight modal footers)
  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs h-8 gap-1.5 font-medium"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            <span>Upload File</span>
          </Button>

          <div className="flex-1 flex items-center gap-1.5">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Or paste file/document URL..."
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleApplyUrl()
                }
              }}
            />
            {urlInput.trim() && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleApplyUrl}
                className="h-8 text-xs font-semibold px-2.5"
              >
                Attach
              </Button>
            )}
          </div>
        </div>
        {uploadError && <p className="text-[11px] text-red-500 font-medium">{uploadError}</p>}
      </div>
    )
  }

  // Full-featured mode (ideal for dialogs and creation forms)
  return (
    <div className={`space-y-2.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{label}</Label>
          <div className="flex rounded-lg border border-border p-0.5 bg-gray-100/70 dark:bg-card">
            <button
              type="button"
              onClick={() => setActiveTab("UPLOAD")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "UPLOAD"
                  ? "bg-white dark:bg-secondary text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-3 w-3" />
              <span>File Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("URL")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "URL"
                  ? "bg-white dark:bg-secondary text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-3 w-3" />
              <span>Document URL</span>
            </button>
          </div>
        </div>
      )}

      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

      {activeTab === "UPLOAD" ? (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border hover:border-primary/50 bg-gray-50/50 dark:bg-card/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Uploading and processing document...
              </span>
            </div>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Click to upload or drag & drop file here
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supports PDF, PowerPoint, Word, Images, Notes, Code (up to {maxSizeMB}MB)
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={placeholderUrl}
                className="pl-9 text-xs h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleApplyUrl()
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleApplyUrl}
              disabled={!urlInput.trim()}
              size="sm"
              className="bg-primary hover:bg-primary-700 text-white text-xs font-semibold px-4 h-9"
            >
              Attach Link
            </Button>
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Paste direct links to Google Drive, LMS slides, Dropbox, OneDrive, or web PDFs.
          </span>
        </div>
      )}

      {uploadError && <p className="text-xs text-red-500 font-medium">{uploadError}</p>}
    </div>
  )
}

