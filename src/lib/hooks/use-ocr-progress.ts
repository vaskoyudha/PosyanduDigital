'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OcrStatus } from '@/types/database'
import { OCR_STATUS_MESSAGES, OCR_STATUS_PROGRESS } from '@/types/ocr'
import type { RealtimeChannel } from '@supabase/supabase-js'

const TERMINAL_STATUSES: OcrStatus[] = ['awaiting_review', 'reviewed', 'committed', 'failed']
const SUBSCRIPTION_TIMEOUT_MS = 3_000
const POLL_INTERVAL_MS = 3_000

export interface UseOcrProgressReturn {
  status: OcrStatus | null
  progress: number
  message: string
  errorMessage: string | null
  isComplete: boolean
}

/**
 * Subscribes to real-time OCR progress updates for a given document.
 * Falls back to polling if Realtime subscription fails to connect within 3 seconds.
 */
export function useOcrProgress(documentId: string | null): UseOcrProgressReturn {
  const [status, setStatus] = useState<OcrStatus | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSubscribedRef = useRef(false)

  const message = status ? OCR_STATUS_MESSAGES[status] : 'Memuat...'
  const isComplete = status !== null && TERMINAL_STATUSES.includes(status)

  // ── Fetch current status ────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    if (!documentId) return

    try {
      const res = await fetch(`/api/ocr/status/${documentId}`)
      if (!res.ok) return

      const data = (await res.json()) as {
        status: OcrStatus
        progress_pct: number
        error_message: string | null
      }

      setStatus(data.status)
      setProgress(data.progress_pct ?? OCR_STATUS_PROGRESS[data.status] ?? 0)
      setErrorMessage(data.error_message)

      // Stop polling if terminal
      if (TERMINAL_STATUSES.includes(data.status)) {
        stopPolling()
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, [documentId])

  // ── Polling helpers ─────────────────────────────────────────────────────

  function startPolling() {
    if (pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(() => {
      void fetchStatus()
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  // ── Main effect ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!documentId) {
      setStatus(null)
      setProgress(0)
      setErrorMessage(null)
      return
    }

    // Fetch initial status immediately
    void fetchStatus()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    // Subscribe to Realtime
    const channel = supabase
      .channel(`ocr-progress-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ocr_documents',
          filter: `id=eq.${documentId}`,
        },
        (payload: { new: { status: OcrStatus; progress_pct: number; error_message: string | null } }) => {
          const { status: newStatus, progress_pct, error_message } = payload.new
          setStatus(newStatus)
          setProgress(progress_pct ?? OCR_STATUS_PROGRESS[newStatus] ?? 0)
          setErrorMessage(error_message)

          if (TERMINAL_STATUSES.includes(newStatus)) {
            stopPolling()
          }
        }
      )
      .subscribe((subStatus: string) => {
        if (subStatus === 'SUBSCRIBED') {
          isSubscribedRef.current = true
        }
      })

    channelRef.current = channel as RealtimeChannel

    // Polling fallback: if not subscribed after 3s, start polling
    const fallbackTimer = setTimeout(() => {
      if (!isSubscribedRef.current) {
        startPolling()
      }
    }, SUBSCRIPTION_TIMEOUT_MS)

    // Cleanup
    return () => {
      clearTimeout(fallbackTimer)
      stopPolling()
      isSubscribedRef.current = false

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, fetchStatus])

  return { status, progress, message, errorMessage, isComplete }
}
