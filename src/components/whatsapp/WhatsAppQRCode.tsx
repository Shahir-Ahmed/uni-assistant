"use client"

import * as React from "react"
import { RefreshCw, MessageCircle, ShieldCheck, QrCode } from "lucide-react"

interface WhatsAppQRCodeProps {
  qrDataUrl?: string | null
  qrString?: string | null
  waVersion?: string | null
  size?: number
  onRefresh?: () => void
  isRefreshing?: boolean
  error?: string | null
}

/**
 * Renders the genuine scannable QR code issued directly by WhatsApp Web servers
 * via the Multi-Device handshake. Never renders fake/synthetic QR patterns.
 */
export function WhatsAppQRCode({
  qrDataUrl,
  qrString,
  waVersion,
  size = 228,
  onRefresh,
  isRefreshing = false,
  error = null,
}: WhatsAppQRCodeProps) {
  return (
    <div className="relative inline-flex flex-col items-center p-4 bg-white rounded-2xl shadow-md border-2 border-emerald-500/30 select-none">
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center rounded-xl overflow-hidden bg-white"
      >
        {qrDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Official WhatsApp Multi-Device Pairing QR Code"
              width={size}
              height={size}
              className="block w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            {/* Center WhatsApp Logo Badge (safe with errorCorrectionLevel H) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-9 w-9 rounded-full bg-white border-2 border-emerald-500 shadow-sm flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <MessageCircle className="h-3.5 w-3.5 fill-white" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4 space-y-2.5">
            {error ? (
              <>
                <QrCode className="h-8 w-8 text-amber-500" />
                <p className="text-[11px] font-semibold text-gray-700 leading-snug">{error}</p>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                  >
                    Retry WhatsApp Handshake
                  </button>
                )}
              </>
            ) : (
              <>
                <RefreshCw className="h-7 w-7 text-emerald-600 animate-spin" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-gray-800">Connecting to WhatsApp</p>
                  <p className="text-[10px] text-gray-500">Requesting authorized Multi-Device QR...</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Verification metadata strip */}
      {qrString && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          <span>Authorized WhatsApp QR {waVersion ? `• v${waVersion}` : ""}</span>
        </div>
      )}

      {/* Refresh overlay */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 z-10">
          <RefreshCw className="h-7 w-7 text-emerald-600 animate-spin" />
          <span className="text-xs font-bold text-gray-800">Requesting New WhatsApp QR...</span>
        </div>
      )}
    </div>
  )
}
