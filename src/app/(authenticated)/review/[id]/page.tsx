'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DocumentViewer } from '@/components/review/document-viewer'
import { ReviewPanel } from '@/components/review/review-panel'
import { ReviewToolbar } from '@/components/review/review-toolbar'
import { BatchTriage } from '@/components/review/batch-triage'
import { useReviewStore } from '@/stores/review-store'
import type { ExtractedRow } from '@/types/ocr'
import { Loader2, AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OcrResultResponse {
  document: {
    id: string
    posyandu_id: string
    original_filename: string | null
    status: string
    bulan_data: string | null
    overall_confidence: number | null
  }
  rows: ExtractedRow[]
  imageUrl: string
}

type ToastType = 'success' | 'error' | 'info'
interface ToastState { message: string; type: ToastType }

// ─── Inline Toast ─────────────────────────────────────────────────────────────

function InlineToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  const icon =
    toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> :
    toast.type === 'error'   ? <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" /> :
                               <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-white px-4 py-3 shadow-lg text-sm max-w-sm',
        toast.type === 'success' && 'border-green-200',
        toast.type === 'error'   && 'border-red-200',
        toast.type === 'info'    && 'border-blue-200',
      )}
    >
      {icon}
      <span>{toast.message}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewDetailPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const { setDocument, rows, approvedRows, corrections, setCommitting, reset } = useReviewStore()

  const [imageUrl, setImageUrl] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [docInfo, setDocInfo] = React.useState<OcrResultResponse['document'] | null>(null)
  const [activeToast, setActiveToast] = React.useState<ToastState | null>(null)

  const showToast = React.useCallback((message: string, type: ToastType) => {
    setActiveToast({ message, type })
  }, [])

  const selectedRowId = useReviewStore((s) => s.selectedRowId)
  const setSelectedRow = useReviewStore((s) => s.setSelectedRow)

  // ── Load OCR data on mount ─────────────────────────────────────────────────
  React.useEffect(() => {
    reset()
    setIsLoading(true)
    setLoadError(null)

    fetch(`/api/ocr/result/${documentId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = (await res.json()) as { error?: string }
          throw new Error(err.error ?? `HTTP ${res.status}`)
        }
        return res.json() as Promise<OcrResultResponse>
      })
      .then((data) => {
        setDocument(documentId, data.rows)
        setImageUrl(data.imageUrl)
        setDocInfo(data.document)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat data')
      })
      .finally(() => {
        setIsLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  // ── Commit handler ─────────────────────────────────────────────────────────
  const handleCommit = React.useCallback(async () => {
    const approvedRowIds = Array.from(approvedRows)
    if (approvedRowIds.length === 0) return

    setCommitting(true)

    try {
      // First, save all corrections
      const correctionItems: Array<{ rowId: string; field: string; value: string }> = []
      for (const [rowId, rowCorr] of Object.entries(corrections)) {
        for (const [field, value] of Object.entries(rowCorr)) {
          if (value !== undefined) {
            correctionItems.push({ rowId, field, value: value as string })
          }
        }
      }

      if (correctionItems.length > 0) {
        await fetch(`/api/review/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ corrections: correctionItems }),
        })
      }

      // Then commit
      const res = await fetch(`/api/review/commit/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedRowIds }),
      })

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string }
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      const result = (await res.json()) as {
        committed: number
        created_children: number
        matched_children: number
        errors: string[]
      }

      if (result.errors && result.errors.length > 0) {
        showToast(
          `${result.committed} baris tersimpan, ${result.errors.length} kesalahan`,
          'info'
        )
        console.warn('Commit errors:', result.errors)
      } else {
        showToast(
          `${result.committed} baris berhasil disimpan ke database`,
          'success'
        )
      }

      // Redirect to upload page
      router.push('/upload')
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan data',
        'error'
      )
    } finally {
      setCommitting(false)
    }
  }, [approvedRows, corrections, documentId, router, setCommitting, showToast])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat dokumen OCR...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-sm">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">Gagal memuat dokumen</p>
          <p className="text-xs text-gray-500">{loadError}</p>
        </div>
      </div>
    )
  }

  // ── Main split-view layout ──────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden -m-4 md:-m-6">
      {/* Left: Document Viewer (55%) */}
      <div className="relative flex-[0_0_55%] h-full min-w-0 border-r">
        {/* Document title bar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 text-xs text-gray-300 flex items-center gap-2">
          <span className="truncate font-medium">
            {docInfo?.original_filename ?? 'Dokumen'}
          </span>
          {docInfo?.bulan_data && (
            <span className="text-gray-400 flex-shrink-0">
              · {docInfo.bulan_data}
            </span>
          )}
          {docInfo?.overall_confidence !== null && docInfo?.overall_confidence !== undefined && (
            <span className="ml-auto flex-shrink-0 text-gray-400">
              {Math.round(docInfo.overall_confidence * 100)}% keyakinan
            </span>
          )}
        </div>

        <DocumentViewer
          imageUrl={imageUrl}
          rows={rows}
          selectedRowId={selectedRowId}
          onRowClick={setSelectedRow}
        />
      </div>

      {/* Right: Review Panel (45%) */}
      <div className="flex-[0_0_45%] h-full min-w-0 flex flex-col">
        <ReviewToolbar onCommit={handleCommit} />
        <div className="flex-1 overflow-hidden">
          <ReviewPanel rows={rows} />
        </div>
      </div>

      {/* Batch Triage Modal */}
      <BatchTriage />

      {/* Inline Toast */}
      {activeToast && (
        <InlineToast toast={activeToast} onDismiss={() => setActiveToast(null)} />
      )}
    </div>
  )
}
