'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UploadProgress } from '@/components/ocr/upload-progress'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DocumentInfo {
  id: string
  original_filename: string | null
  bulan_data: string | null
  created_at: string
  file_size_bytes: number | null
  mime_type: string | null
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

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadDetailPage() {
  const params = useParams()
  const documentId = params.id as string

  const [doc, setDoc] = React.useState<DocumentInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchDocument() {
      setIsLoading(true)
      setError(null)

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any
        const { data, error: fetchErr } = await supabase
          .from('ocr_documents')
          .select('id, original_filename, bulan_data, created_at, file_size_bytes, mime_type')
          .eq('id', documentId)
          .single()

        if (fetchErr || !data) {
          setError('Dokumen tidak ditemukan.')
          return
        }

        setDoc(data as DocumentInfo)
      } catch {
        setError('Terjadi kesalahan saat memuat data.')
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId) {
      void fetchDocument()
    }
  }, [documentId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton rows={3} />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/upload">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? 'Dokumen tidak ditemukan.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild>
        <Link href="/upload">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Unggahan
        </Link>
      </Button>

      {/* Document info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detail Dokumen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nama File</p>
              <p className="text-sm font-medium">{doc.original_filename ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bulan Data</p>
              <p className="text-sm font-medium">{formatBulanData(doc.bulan_data)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Waktu Unggah</p>
              <p className="text-sm font-medium">{formatTimestamp(doc.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ukuran File</p>
              <p className="text-sm font-medium">{formatFileSize(doc.file_size_bytes)}</p>
            </div>
            {doc.mime_type && (
              <div>
                <p className="text-xs text-muted-foreground">Tipe File</p>
                <p className="text-sm font-medium">{doc.mime_type}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Pemrosesan</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadProgress documentId={documentId} />
        </CardContent>
      </Card>
    </div>
  )
}
