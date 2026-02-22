import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSKDNByPuskesmas, getSKDNTrend } from '@/lib/analytics/skdn'
import { getPrevalence } from '@/lib/analytics/prevalence'
import { getAlerts } from '@/lib/analytics/alerts'
import { KpiCard } from '@/components/analytics/kpi-card'
import { PosyanduTable } from '@/components/analytics/posyandu-table'
import { SpmProgress } from '@/components/analytics/spm-progress'
import { SKDNTrendChart } from '@/components/analytics/skdn-trend-chart'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, TrendingUp, BarChart2, AlertTriangle } from 'lucide-react'
import type { KpiColor } from '@/components/analytics/kpi-card'

/* eslint-disable @typescript-eslint/no-explicit-any */

const currentMonth = () => new Date().toISOString().slice(0, 7)

function dsColor(pct: number): KpiColor {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'yellow'
  return 'red'
}

export default async function DashboardKepalaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('user_profiles')
    .select('posyandu_id, puskesmas_id, nama')
    .eq('id', user.id)
    .single()

  const puskesmasId: string | null = profileData?.puskesmas_id ?? null
  const bulan = currentMonth()

  let puskesmasNama = 'Puskesmas'
  if (puskesmasId) {
    const { data: pkData } = await (supabase as any)
      .from('puskesmas')
      .select('nama')
      .eq('id', puskesmasId)
      .maybeSingle()
    puskesmasNama = pkData?.nama ?? puskesmasNama
  }

  // Aggregate SKDN across all posyandu in puskesmas
  const allSkdn = puskesmasId
    ? await getSKDNByPuskesmas(supabase as any, puskesmasId, bulan)
    : []

  const totalS = allSkdn.reduce((s, p) => s + p.S, 0)
  const totalD = allSkdn.reduce((s, p) => s + p.D, 0)
  const totalN = allSkdn.reduce((s, p) => s + p.N, 0)
  const totalBGM = allSkdn.reduce((s, p) => s + p.BGM, 0)
  const agg_ds_pct = totalS > 0 ? Math.round((totalD / totalS) * 1000) / 10 : 0
  const agg_nd_pct = totalD > 0 ? Math.round((totalN / totalD) * 1000) / 10 : 0

  // Prevalence for puskesmas scope
  const prevalence = puskesmasId
    ? await getPrevalence(supabase as any, 'puskesmas', puskesmasId, bulan)
    : null

  // Alerts
  const alerts = puskesmasId
    ? await getAlerts(supabase as any, puskesmasId)
    : []

  // SKDN trend (use first posyandu or aggregate)
  const firstPosyanduId = allSkdn[0]?.posyanduId
  const trend = firstPosyanduId
    ? await getSKDNTrend(supabase as any, firstPosyanduId, 6)
    : []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 pb-2 border-b border-gray-100">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Kepala Puskesmas</h1>
        <p className="text-sm text-muted-foreground">
          {puskesmasNama} · {bulan}
        </p>
      </div>

      {!puskesmasId && (
        <EmptyState
          variant="generic"
          title="Puskesmas belum ditetapkan"
          description="Hubungi administrator untuk menetapkan puskesmas Anda."
        />
      )}

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="D/S (Penimbangan)"
          value={agg_ds_pct.toFixed(1)}
          unit="%"
          color={dsColor(agg_ds_pct)}
          icon={<Scale className="h-4 w-4" />}
          tooltip="Agregat seluruh posyandu. Target: ≥ 80%"
        />
        <KpiCard
          title="N/D (Naik Berat)"
          value={agg_nd_pct.toFixed(1)}
          unit="%"
          color={agg_nd_pct >= 80 ? 'green' : agg_nd_pct >= 60 ? 'yellow' : 'red'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Stunting"
          value={prevalence?.stunting_pct.toFixed(1) ?? '–'}
          unit="%"
          color={
            !prevalence ? 'neutral'
            : prevalence.stunting_pct < 10 ? 'green'
            : prevalence.stunting_pct < 20 ? 'yellow' : 'red'
          }
          icon={<BarChart2 className="h-4 w-4" />}
          tooltip="Prevalensi stunting di wilayah puskesmas"
        />
        <KpiCard
          title="Total BGM"
          value={totalBGM}
          unit="anak"
          color={totalBGM === 0 ? 'green' : totalBGM <= 5 ? 'yellow' : 'red'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* SPM Progress */}
      <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Capaian SPM</CardTitle>
        </CardHeader>
        <CardContent>
          <SpmProgress ds_pct={agg_ds_pct} />
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {trend.length > 0 && (
        <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900">Tren SKDN 6 Bulan</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SKDNTrendChart data={trend} />
          </CardContent>
        </Card>
      )}

      {/* Posyandu Ranking */}
      {puskesmasId && (
        <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Ranking Posyandu (D/S%)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PosyanduTable puskesmasId={puskesmasId} bulan={bulan} />
          </CardContent>
        </Card>
      )}

      {/* Alert Summary */}
      <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Ringkasan Peringatan — {alerts.length} anak berisiko
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'BGM', count: alerts.filter(a => a.alertType === 'BGM').length, color: 'bg-rose-100 text-rose-800' },
              { label: 'Tidak Naik 2×', count: alerts.filter(a => a.alertType === '2T').length, color: 'bg-orange-100 text-orange-800' },
              { label: 'BB Turun', count: alerts.filter(a => a.alertType === 'BB_TURUN').length, color: 'bg-amber-100 text-amber-800' },
              { label: 'Tidak Datang', count: alerts.filter(a => a.alertType === 'TIDAK_DATANG').length, color: 'bg-slate-100 text-slate-700' },
            ].map(item => (
              <div key={item.label} className={`rounded-lg p-4 text-center ${item.color}`}>
                <p className="text-2xl font-bold tabular-nums">{item.count}</p>
                <p className="text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
