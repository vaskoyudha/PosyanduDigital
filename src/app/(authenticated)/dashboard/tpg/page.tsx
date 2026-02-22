import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateSKDN, getSKDNTrend } from '@/lib/analytics/skdn'
import { getPrevalence, getPrevalenceByPosyandu } from '@/lib/analytics/prevalence'
import { getAlerts } from '@/lib/analytics/alerts'
import { KpiCard } from '@/components/analytics/kpi-card'
import { SKDNTrendChart } from '@/components/analytics/skdn-trend-chart'
import { PrevalenceBarChart } from '@/components/analytics/prevalence-bar-chart'
import { AlertList } from '@/components/analytics/alert-list'
import { PosyanduTable } from '@/components/analytics/posyandu-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, TrendingUp, BarChart2, AlertTriangle, Scale } from 'lucide-react'
import type { KpiColor } from '@/components/analytics/kpi-card'

/* eslint-disable @typescript-eslint/no-explicit-any */

const currentMonth = () => new Date().toISOString().slice(0, 7)

function dsColor(pct: number): KpiColor {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'yellow'
  return 'red'
}

export default async function DashboardTpgPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('user_profiles')
    .select('posyandu_id, puskesmas_id, nama')
    .eq('id', user.id)
    .single()

  const posyanduId: string | null = profileData?.posyandu_id ?? null
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

  // If TPG has posyandu_id, use that; otherwise aggregate puskesmas level
  const scopeId = posyanduId ?? puskesmasId
  const scope = posyanduId ? 'posyandu' : 'puskesmas'

  const [skdn, trend, prevalence, allAlerts] = await Promise.all([
    scopeId ? calculateSKDN(supabase as any, posyanduId ?? '', bulan) : null,
    posyanduId ? getSKDNTrend(supabase as any, posyanduId, 6) : Promise.resolve([]),
    scopeId ? getPrevalence(supabase as any, scope as any, scopeId, bulan) : null,
    puskesmasId ? getAlerts(supabase as any, puskesmasId) : Promise.resolve([]),
  ])

  const prevByPosyandu = puskesmasId
    ? await getPrevalenceByPosyandu(supabase as any, puskesmasId, bulan)
    : []

  const prevalenceChartData = prevByPosyandu.map(p => ({
    name: p.scopeName ?? p.scopeId,
    stunting: p.stunting_pct,
    wasting: p.wasting_pct,
    underweight: p.underweight_pct,
    overweight: p.overweight_pct,
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 pb-2 border-b border-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard TPG</h1>
            <p className="text-sm text-muted-foreground">
              {puskesmasNama} · {bulan}
            </p>
          </div>
          <Link
            href="/export"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor Data
          </Link>
        </div>
      </div>

      {!puskesmasId && !posyanduId && (
        <EmptyState
          variant="generic"
          title="Wilayah belum ditetapkan"
          description="Hubungi administrator untuk menetapkan wilayah kerja Anda."
        />
      )}

      {/* KPI Cards */}
      {skdn && prevalence && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="D/S (Penimbangan)"
            value={skdn.ds_pct.toFixed(1)}
            unit="%"
            color={dsColor(skdn.ds_pct)}
            icon={<Scale className="h-4 w-4" />}
            tooltip="Target: ≥ 80%"
          />
          <KpiCard
            title="N/D (Naik Berat)"
            value={skdn.nd_pct.toFixed(1)}
            unit="%"
            color={skdn.nd_pct >= 80 ? 'green' : skdn.nd_pct >= 60 ? 'yellow' : 'red'}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            title="Stunting"
            value={prevalence.stunting_pct.toFixed(1)}
            unit="%"
            color={prevalence.stunting_pct < 10 ? 'green' : prevalence.stunting_pct < 20 ? 'yellow' : 'red'}
            icon={<BarChart2 className="h-4 w-4" />}
            tooltip="Prevalensi stunting (TB/U < -2SD)"
          />
          <KpiCard
            title="BGM"
            value={skdn.BGM}
            unit="anak"
            color={skdn.BGM === 0 ? 'green' : skdn.BGM <= 2 ? 'yellow' : 'red'}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>
      )}

      {/* SKDN Trend Chart */}
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

      {/* Prevalence Chart */}
      {prevalenceChartData.length > 0 && (
        <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900">Prevalensi Gizi per Posyandu</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PrevalenceBarChart data={prevalenceChartData} />
          </CardContent>
        </Card>
      )}

      {/* Posyandu Comparison Table */}
      {puskesmasId && (
        <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Perbandingan Posyandu</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PosyanduTable puskesmasId={puskesmasId} bulan={bulan} />
          </CardContent>
        </Card>
      )}

      {/* Alert List */}
      <Card className="shadow-sm border-0 ring-1 ring-gray-100/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Anak Berisiko ({allAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AlertList alerts={allAlerts} />
        </CardContent>
      </Card>
    </div>
  )
}
