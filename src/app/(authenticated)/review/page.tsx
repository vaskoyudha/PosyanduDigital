import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye, FileText, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewQueueItem {
  id: string
  original_filename: string | null
  bulan_data: string | null
  overall_confidence: number | null
  created_at: string
  posyandu_id: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return `${day}/${month}/${year}`
}

function confidenceColor(confidence: number | null): string {
  if (confidence === null) return 'bg-gray-100 text-gray-600'
  if (confidence >= 0.9) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (confidence >= 0.65) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function ReviewQueuePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user profile for posyandu scope
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('user_profiles')
    .select('posyandu_id, role')
    .eq('id', user.id)
    .single() as {
      data: { posyandu_id: string | null; role: string } | null
    }

  if (!profile?.posyandu_id) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Anda belum terdaftar di posyandu manapun.
        </p>
      </div>
    )
  }

  // Fetch awaiting_review documents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: docs, error } = await (supabase as any)
    .from('ocr_documents')
    .select('id, original_filename, bulan_data, overall_confidence, created_at, posyandu_id')
    .eq('status', 'awaiting_review')
    .eq('posyandu_id', profile.posyandu_id)
    .order('created_at', { ascending: true }) as {
      data: ReviewQueueItem[] | null
      error: { message: string } | null
    }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat antrian tinjauan: {error.message}
        </div>
      </div>
    )
  }

  const items = docs ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Antrian Tinjauan OCR</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dokumen yang menunggu tinjauan dan koreksi manual
        </p>
      </div>

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Menunggu Tinjauan
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {items.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Eye className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Tidak ada dokumen yang menunggu tinjauan
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Semua dokumen sudah ditinjau atau belum diproses
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/upload">Unggah Dokumen Baru</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 flex-shrink-0">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {doc.original_filename ?? 'Dokumen'}
                      </p>
                      {doc.overall_confidence !== null && (
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${confidenceColor(doc.overall_confidence)}`}
                        >
                          {Math.round(doc.overall_confidence * 100)}% keyakinan
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{formatBulanData(doc.bulan_data)}</span>
                      <span>·</span>
                      <span>Diunggah {formatTimestamp(doc.created_at)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/review/${doc.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Tinjau
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
