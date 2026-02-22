'use client'

import * as React from 'react'
import Link from 'next/link'
import { Upload, FileText, Eye, Clock } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { UploadDropzone } from '@/components/ocr/upload-dropzone'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { OcrStatus } from '@/types/database'
import { OCR_STATUS_MESSAGES, OCR_STATUS_PROGRESS } from '@/types/ocr'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OcrDocument {
  id: string
  original_filename: string | null
  bulan_data: string | null
  status: OcrStatus
  created_at: string
  file_size_bytes: number | null
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

function statusBadgeClass(status: OcrStatus): string {
  switch (status) {
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'awaiting_review':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'reviewed':
    case 'committed':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatBulanData(bulan: string | null): string {
  if (!bulan) return '-'
  const [year, month] = bulan.split('-')
  const monthIdx = parseInt(month, 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return bulan
  return `${MONTH_NAMES_ID[monthIdx]} ${year}`
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { posyandu_id, isLoading: userLoading } = useUser()
  const [documents, setDocuments] = React.useState<OcrDocument[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // ── Fetch recent uploads ────────────────────────────────────────────────

  const fetchDocuments = React.useCallback(async () => {
    if (!posyandu_id) return

    setIsLoading(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error: fetchErr } = await supabase
        .from('ocr_documents')
        .select('id, original_filename, bulan_data, status, created_at, file_size_bytes')
        .eq('posyandu_id', posyandu_id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (fetchErr) {
        console.error('Fetch documents error:', fetchErr)
        setError('Gagal memuat daftar unggahan.')
        return
      }

      setDocuments((data ?? []) as OcrDocument[])
    } catch {
      setError('Terjadi kesalahan saat memuat data.')
    } finally {
      setIsLoading(false)
    }
  }, [posyandu_id])

  React.useEffect(() => {
    if (userLoading) return
    void fetchDocuments()
  }, [userLoading, fetchDocuments])

  // ── Upload handler ──────────────────────────────────────────────────────

  async function handleUpload(files: File[], bulanData: string) {
    if (!posyandu_id) throw new Error('Posyandu tidak ditemukan')

    const results: string[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bulan_data', bulanData)
      formData.append('posyandu_id', posyandu_id)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string }
        throw new Error(errData.error ?? `Gagal mengunggah ${file.name}`)
      }

      const data = (await res.json()) as { document_id: string }
      results.push(data.document_id)
    }

    // Refresh document list after upload
    await fetchDocuments()
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton rows={4} />
      </div>
    )
  }

  if (!posyandu_id) {
    return (
      <EmptyState
        variant="generic"
        description="Anda belum terdaftar di posyandu manapun."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Unggah Dokumen OCR</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Unggah foto register posyandu untuk diproses secara otomatis
        </p>
      </div>

      {/* Dropzone */}
      <UploadDropzone
        posyanduId={posyandu_id}
        onUpload={handleUpload}
      />

      {/* Recent uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Unggahan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              variant="generic"
              description="Belum ada dokumen yang diunggah."
            />
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const isProcessing = !['awaiting_review', 'reviewed', 'committed', 'failed'].includes(doc.status)
                const progressValue = OCR_STATUS_PROGRESS[doc.status] ?? 0

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {doc.original_filename ?? 'Dokumen'}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn('text-xs flex-shrink-0', statusBadgeClass(doc.status))}
                        >
                          {OCR_STATUS_MESSAGES[doc.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatBulanData(doc.bulan_data)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(doc.created_at)}
                        </span>
                      </div>
                      {isProcessing && (
                        <Progress value={progressValue} className="h-1.5 mt-1.5" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      {doc.status === 'awaiting_review' ? (
                        <Button variant="default" size="sm" asChild>
                          <Link href={`/review/${doc.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Tinjau
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/upload/${doc.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Detail
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
