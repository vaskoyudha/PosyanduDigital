import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateSKDN } from '@/lib/analytics/skdn'
import { getBelumDitimbang } from '@/lib/analytics/alerts'
import { KpiCard } from '@/components/analytics/kpi-card'
import { BelumDitimbang } from '@/components/analytics/belum-ditimbang'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scale, AlertTriangle, TrendingUp, FileText, Upload } from 'lucide-react'
import type { KpiColor } from '@/components/analytics/kpi-card'

/* eslint-disable @typescript-eslint/no-explicit-any */

const currentMonth = () => new Date().toISOString().slice(0, 7)

function dsColor(pct: number): KpiColor {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'yellow'
  return 'red'
}

export default async function DashboardKaderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('user_profiles')
    .select('posyandu_id, nama, puskesmas_id')
    .eq('id', user.id)
    .single()

  const posyanduId: string | null = profileData?.posyandu_id ?? null
  const bulan = currentMonth()

  // Posyandu name
  let posyanduNama = 'Posyandu'
  if (posyanduId) {
    const { data: pData } = await (supabase as any)
      .from('posyandu')
      .select('nama')
      .eq('id', posyanduId)
      .maybeSingle()
    posyanduNama = pData?.nama ?? posyanduNama
  }

  // SKDN data
  const skdn = posyanduId
    ? await calculateSKDN(supabase as any, posyanduId, bulan)
    : null

  // Recent OCR uploads
  const { data: recentDocs } = posyanduId
    ? await (supabase as any)
        .from('ocr_documents')
        .select('id, original_filename, status, created_at, bulan_data')
        .eq('posyandu_id', posyanduId)
        .order('created_at', { ascending: false })
        .limit(3)
    : { data: [] as any[] }

  const belumDitimbangCount = posyanduId
    ? (await getBelumDitimbang(supabase as any, posyanduId, bulan)).length
    : 0

  const OCR_STATUS_LABELS: Record<string, string> = {
    uploaded: 'Diunggah',
    preprocessing: 'Diproses',
    awaiting_review: 'Menunggu Review',
    reviewed: 'Diulas',
    committed: 'Selesai',
    failed: 'Gagal',
  }
  const OCR_STATUS_CLASS: Record<string, string> = {
    uploaded: 'bg-slate-100 text-slate-700',
    preprocessing: 'bg-blue-100 text-blue-700',
    awaiting_review: 'bg-amber-100 text-amber-700',
    reviewed: 'bg-indigo-100 text-indigo-700',
    committed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 pb-2 border-b border-gray-100">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Dashboard Kader
        </h1>
        <p className="text-sm text-muted-foreground">
          {posyanduNama} · {bulan}
        </p>
      </div>

      {!posyanduId && (
        <EmptyState
          variant="generic"
          title="Posyandu belum ditetapkan"
          description="Hubungi administrator untuk menetapkan posyandu Anda."
        />
      )}

      {posyanduId && skdn && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              title="D/S (Penimbangan)"
              value={skdn.ds_pct.toFixed(1)}
              unit="%"
              color={dsColor(skdn.ds_pct)}
              icon={<Scale className="h-4 w-4" />}
              tooltip="Persentase anak yang ditimbang (D) dari sasaran (S). Target: ≥ 80%"
            />
            <KpiCard
              title="N/D (Naik Berat)"
              value={skdn.nd_pct.toFixed(1)}
              unit="%"
              color={skdn.nd_pct >= 80 ? 'green' : skdn.nd_pct >= 60 ? 'yellow' : 'red'}
              icon={<TrendingUp className="h-4 w-4" />}
              tooltip="Persentase anak yang naik berat badan (N) dari yang ditimbang (D). Target: ≥ 80%"
            />
            <KpiCard
              title="BGM (Gizi Buruk)"
              value={skdn.BGM}
              unit="anak"
              color={skdn.BGM === 0 ? 'green' : skdn.BGM <= 2 ? 'yellow' : 'red'}
              icon={<AlertTriangle className="h-4 w-4" />}
              tooltip="Jumlah anak Bawah Garis Merah (status gizi buruk)"
            />
          </div>

          {/* SKDN Summary */}
          <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Ringkasan SKDN — {bulan}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'S Sasaran', value: skdn.S, color: 'text-slate-700' },
                  { label: 'K Ber-KMS', value: skdn.K, color: 'text-blue-700' },
                  { label: 'D Ditimbang', value: skdn.D, color: 'text-indigo-700' },
                  { label: 'N Naik', value: skdn.N, color: 'text-emerald-700' },
                ].map(item => (
                  <div key={item.label}>
                    <p className={`text-3xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Belum Ditimbang */}
          <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Belum Ditimbang Bulan Ini
                </CardTitle>
                {belumDitimbangCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                    {belumDitimbangCount} anak
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <BelumDitimbang posyanduId={posyanduId} bulan={bulan} />
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Uploads */}
      <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Upload Terakhir</CardTitle>
            <Link
              href="/upload"
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Upload className="h-3 w-3" />
              Upload Baru
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {(!recentDocs || recentDocs.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada dokumen yang diunggah.</p>
          ) : (
            <div className="divide-y divide-border">
              {(recentDocs as any[]).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.original_filename ?? 'Tanpa nama'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.bulan_data ?? '–'}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${OCR_STATUS_CLASS[doc.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {OCR_STATUS_LABELS[doc.status] ?? doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
