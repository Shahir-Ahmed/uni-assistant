"use client"

import * as React from "react"

interface StructuredMessageProps {
  content: string
  isUser?: boolean
}

export function StructuredMessage({ content, isUser = false }: StructuredMessageProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
  }

  // Parse lines to handle headers, tables, lists, and paragraphs
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let tableBuffer: string[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return
    const rows = tableBuffer.map((line) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length)
    )
    tableBuffer = []

    // Filter out separator row e.g. |--|--|
    const headerRow = rows[0] || []
    const dataRows = rows.slice(1).filter((r) => !r.every((cell) => /^[-:]+$/.test(cell)))

    elements.push(
      <div key={key} className="overflow-x-auto my-3 border border-border rounded-lg shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-100 dark:bg-muted font-semibold text-gray-900 dark:text-gray-100 border-b border-border">
            <tr>
              {headerRow.map((cell, ci) => (
                <th key={ci} className="py-2 px-3 border-r border-border last:border-r-0">
                  {formatInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dataRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50/50 dark:hover:bg-muted/40">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 border-r border-border last:border-r-0">
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block detection
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-3 my-2 bg-gray-950 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        )
        codeBuffer = []
        inCodeBlock = false
      } else {
        if (tableBuffer.length > 0) flushTable(`table-${i}`)
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // Table detection
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      tableBuffer.push(line.trim())
      continue
    } else if (tableBuffer.length > 0) {
      flushTable(`table-${i}`)
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1">
          {formatInline(line.replace(/^###\s+/, ""))}
        </h4>
      )
      continue
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-base font-bold text-primary dark:text-primary-400 mt-4 mb-2 pb-1 border-b border-border/60"
        >
          {formatInline(line.replace(/^##\s+/, ""))}
        </h3>
      )
      continue
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg font-extrabold text-gray-900 dark:text-gray-50 mt-4 mb-2 pb-1.5 border-b border-border"
        >
          {formatInline(line.replace(/^#\s+/, ""))}
        </h2>
      )
      continue
    }

    // Bullet points
    if (line.match(/^(\*|-|•)\s+/)) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 pl-1 text-xs sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
          <div className="flex-1 leading-relaxed">
            {formatInline(line.replace(/^(\*|-|•)\s+/, ""))}
          </div>
        </div>
      )
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="pl-3 py-1 my-2 border-l-2 border-primary/60 italic text-xs text-muted-foreground bg-primary/5 rounded-r"
        >
          {formatInline(line.replace(/^>\s+/, ""))}
        </blockquote>
      )
      continue
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="h-2" />)
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 text-xs sm:text-sm leading-relaxed">
        {formatInline(line)}
      </p>
    )
  }

  if (tableBuffer.length > 0) {
    flushTable("table-end")
  }

  return <div className="space-y-0.5">{elements}</div>
}

/**
 * Format inline bold (**text**), code (`code`), and links ([text](url))
 */
function formatInline(text: string): React.ReactNode {
  // Replace inline bold, code, math symbols cleanly
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\$\$[^\$]+\$\$|\$[^\$]+\$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-gray-900 dark:text-gray-100">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="bg-gray-200/70 dark:bg-muted text-primary dark:text-primary-300 px-1 py-0.5 rounded text-[11px] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkText = token.slice(1, token.indexOf("]("))
      const linkUrl = token.slice(token.indexOf("](") + 2, -1)
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline hover:text-primary-700 font-medium"
        >
          {linkText}
        </a>
      )
    } else if ((token.startsWith("$$") && token.endsWith("$$")) || (token.startsWith("$") && token.endsWith("$"))) {
      const math = token.replace(/^\$+|\$+$/g, "")
      parts.push(
        <span key={match.index} className="font-mono text-xs text-primary-700 dark:text-primary-300">
          {math}
        </span>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
