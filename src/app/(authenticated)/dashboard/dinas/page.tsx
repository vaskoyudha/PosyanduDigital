import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSKDNByPuskesmas } from '@/lib/analytics/skdn'
import { getPrevalence } from '@/lib/analytics/prevalence'
import { getAlerts } from '@/lib/analytics/alerts'
import { KpiCard } from '@/components/analytics/kpi-card'
import { PrevalenceBarChart } from '@/components/analytics/prevalence-bar-chart'
import { SpmProgress } from '@/components/analytics/spm-progress'
import { AlertList } from '@/components/analytics/alert-list'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, TrendingUp, BarChart2, AlertTriangle, Building2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KpiColor } from '@/components/analytics/kpi-card'

/* eslint-disable @typescript-eslint/no-explicit-any */

const currentMonth = () => new Date().toISOString().slice(0, 7)

function dsColor(pct: number): KpiColor {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'yellow'
  return 'red'
}

function dsPctClass(pct: number) {
  if (pct >= 80) return 'text-emerald-700 font-semibold'
  if (pct >= 50) return 'text-amber-700 font-semibold'
  return 'text-rose-700 font-semibold'
}

export default async function DashboardDinasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('user_profiles')
    .select('nama, district_id')
    .eq('id', user.id)
    .single()

  const districtId: string | null = profileData?.district_id ?? null
  const bulan = currentMonth()

  // Get all puskesmas in district (or all puskesmas if no district assigned)
  let puskesmasList: Array<{ id: string; nama: string }> = []
  if (districtId) {
    const { data } = await (supabase as any)
      .from('puskesmas')
      .select('id, nama')
      .eq('district_id', districtId)
      .order('nama')
    puskesmasList = data ?? []
  } else {
    // Dinas without district_id → show all puskesmas
    const { data } = await (supabase as any)
      .from('puskesmas')
      .select('id, nama')
      .order('nama')
    puskesmasList = data ?? []
  }

  // Aggregate SKDN per puskesmas
  const puskesmasAggregates = await Promise.all(
    puskesmasList.map(async (pk) => {
      const skdnList = await getSKDNByPuskesmas(supabase as any, pk.id, bulan)
      const totalS = skdnList.reduce((s, p) => s + p.S, 0)
      const totalD = skdnList.reduce((s, p) => s + p.D, 0)
      const totalN = skdnList.reduce((s, p) => s + p.N, 0)
      const totalBGM = skdnList.reduce((s, p) => s + p.BGM, 0)
      const ds_pct = totalS > 0 ? Math.round((totalD / totalS) * 1000) / 10 : 0
      const nd_pct = totalD > 0 ? Math.round((totalN / totalD) * 1000) / 10 : 0

      // Check data completeness: how many posyandu submitted skdn_monthly this month
      const posyanduIds = skdnList.map((s) => s.posyanduId)
      let submittedCount = 0
      if (posyanduIds.length > 0) {
        const { data: submittedRows } = await (supabase as any)
          .from('skdn_monthly')
          .select('posyandu_id')
          .eq('bulan', `${bulan}-01`)
          .in('posyandu_id', posyanduIds)
        submittedCount = (submittedRows ?? []).length
      }
      const totalPosyandu = skdnList.length

      return {
        puskesmasId: pk.id,
        puskesmasNama: pk.nama,
        totalS,
        totalD,
        totalN,
        totalBGM,
        ds_pct,
        nd_pct,
        submittedCount,
        totalPosyandu,
      }
    })
  )

  // District-wide aggregates
  const grandS = puskesmasAggregates.reduce((s, p) => s + p.totalS, 0)
  const grandD = puskesmasAggregates.reduce((s, p) => s + p.totalD, 0)
  const grandN = puskesmasAggregates.reduce((s, p) => s + p.totalN, 0)
  const grandBGM = puskesmasAggregates.reduce((s, p) => s + p.totalBGM, 0)
  const grand_ds_pct = grandS > 0 ? Math.round((grandD / grandS) * 1000) / 10 : 0
  const grand_nd_pct = grandD > 0 ? Math.round((grandN / grandD) * 1000) / 10 : 0

  // District-wide stunting prevalence (aggregate across all puskesmas)
  let districtStunting = 0
  let districtTotalMeasured = 0
  for (const pk of puskesmasList) {
    const prev = await getPrevalence(supabase as any, 'puskesmas', pk.id, bulan)
    districtStunting += prev.stunting_count
    districtTotalMeasured += prev.total_measured
  }
  const districtStunting_pct = districtTotalMeasured > 0
    ? Math.round((districtStunting / districtTotalMeasured) * 1000) / 10
    : 0

  // Prevalence per puskesmas for bar chart
  const prevalenceByPuskesmas = await Promise.all(
    puskesmasList.map(async (pk) => {
      const prev = await getPrevalence(supabase as any, 'puskesmas', pk.id, bulan)
      return {
        name: pk.nama,
        stunting: prev.stunting_pct,
        wasting: prev.wasting_pct,
        underweight: prev.underweight_pct,
        overweight: prev.overweight_pct,
      }
    })
  )

  // Alerts across district (limit to first 3 puskesmas to avoid excessive DB load)
  const alertPuskesmasList = puskesmasList.slice(0, 3)
  const alertsNested = await Promise.all(
    alertPuskesmasList.map(pk => getAlerts(supabase as any, pk.id))
  )
  const priorityOrder: Record<string, number> = { BGM: 0, '2T': 1, BB_TURUN: 2, TIDAK_DATANG: 3 }
  const allAlerts = alertsNested
    .flat()
    .sort((a, b) => (priorityOrder[a.alertType] ?? 9) - (priorityOrder[b.alertType] ?? 9))
    .slice(0, 50)

  // Data completeness summary
  const totalPosyanduAll = puskesmasAggregates.reduce((s, p) => s + p.totalPosyandu, 0)
  const submittedAll = puskesmasAggregates.reduce((s, p) => s + p.submittedCount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Dinas Kesehatan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {districtId ? 'Wilayah Kabupaten/Kota' : 'Semua Wilayah'} · {bulan}
        </p>
      </div>

      {puskesmasList.length === 0 && (
        <EmptyState
          variant="generic"
          title="Belum ada data puskesmas"
          description="Belum ada puskesmas yang terdaftar di wilayah ini."
        />
      )}

      {/* District-wide KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="D/S Kabupaten/Kota"
          value={grand_ds_pct.toFixed(1)}
          unit="%"
          color={dsColor(grand_ds_pct)}
          icon={<Scale className="h-4 w-4" />}
          tooltip="Agregat seluruh puskesmas. Target: ≥ 80%"
        />
        <KpiCard
          title="N/D Kabupaten/Kota"
          value={grand_nd_pct.toFixed(1)}
          unit="%"
          color={grand_nd_pct >= 80 ? 'green' : grand_nd_pct >= 60 ? 'yellow' : 'red'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Stunting Kabupaten/Kota"
          value={districtStunting_pct.toFixed(1)}
          unit="%"
          color={
            districtStunting_pct < 10 ? 'green'
            : districtStunting_pct < 20 ? 'yellow' : 'red'
          }
          icon={<BarChart2 className="h-4 w-4" />}
          tooltip="Prevalensi stunting agregat seluruh wilayah"
        />
        <KpiCard
          title="Total BGM"
          value={grandBGM}
          unit="anak"
          color={grandBGM === 0 ? 'green' : grandBGM <= 10 ? 'yellow' : 'red'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* SPM Progress — district-wide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Capaian SPM Kabupaten/Kota</CardTitle>
        </CardHeader>
        <CardContent>
          <SpmProgress ds_pct={grand_ds_pct} />
        </CardContent>
      </Card>

      {/* Puskesmas Comparison Table */}
      {puskesmasAggregates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Perbandingan Puskesmas ({puskesmasList.length})
              </CardTitle>
              <span className="text-xs text-muted-foreground">Disortir berdasarkan D/S%</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4 text-left font-medium">Puskesmas</th>
                    <th className="py-2 pr-3 text-right font-medium">S</th>
                    <th className="py-2 pr-3 text-right font-medium">D</th>
                    <th className="py-2 pr-3 text-right font-medium">D/S%</th>
                    <th className="py-2 pr-3 text-right font-medium">N/D%</th>
                    <th className="py-2 pr-3 text-right font-medium">BGM</th>
                    <th className="py-2 text-center font-medium">Data Masuk</th>
                  </tr>
                </thead>
                <tbody>
                  {[...puskesmasAggregates]
                    .sort((a, b) => b.ds_pct - a.ds_pct)
                    .map((pk, idx) => (
                    <tr
                      key={pk.puskesmasId}
                      className={cn('border-b last:border-0', idx % 2 !== 0 && 'bg-muted/30')}
                    >
                      <td className="py-2 pr-4 font-medium">{pk.puskesmasNama}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{pk.totalS}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{pk.totalD}</td>
                      <td className={cn('py-2 pr-3 text-right tabular-nums', dsPctClass(pk.ds_pct))}>
                        {pk.ds_pct.toFixed(1)}%
                      </td>
                      <td className={cn('py-2 pr-3 text-right tabular-nums',
                        pk.nd_pct >= 70 ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'
                      )}>
                        {pk.nd_pct.toFixed(1)}%
                      </td>
                      <td className={cn('py-2 pr-3 text-right tabular-nums',
                        pk.totalBGM > 0 ? 'text-rose-600 font-semibold' : 'text-muted-foreground'
                      )}>
                        {pk.totalBGM}
                      </td>
                      <td className="py-2 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          pk.totalPosyandu === 0 ? 'bg-slate-100 text-slate-600'
                          : pk.submittedCount === pk.totalPosyandu ? 'bg-emerald-100 text-emerald-700'
                          : pk.submittedCount > 0 ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                        )}>
                          {pk.submittedCount}/{pk.totalPosyandu}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Completeness Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Building2 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{puskesmasList.length}</p>
                <p className="text-xs text-muted-foreground">Total Puskesmas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{submittedAll}</p>
                <p className="text-xs text-muted-foreground">Posyandu Lapor Bulan Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                'rounded-lg p-2',
                submittedAll < totalPosyanduAll ? 'bg-amber-100' : 'bg-emerald-100'
              )}>
                <BarChart2 className={cn(
                  'h-5 w-5',
                  submittedAll < totalPosyanduAll ? 'text-amber-700' : 'text-emerald-700'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {totalPosyanduAll > 0
                    ? `${Math.round((submittedAll / totalPosyanduAll) * 100)}%`
                    : '–'}
                </p>
                <p className="text-xs text-muted-foreground">Kelengkapan Data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* District Prevalence Bar Chart (by puskesmas) */}
      {prevalenceByPuskesmas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Prevalensi Gizi per Puskesmas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PrevalenceBarChart data={prevalenceByPuskesmas} />
          </CardContent>
        </Card>
      )}

      {/* Alert Summary across district */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">
              Anak Berisiko — {allAlerts.length} kasus prioritas
            </CardTitle>
            {alertPuskesmasList.length < puskesmasList.length && (
              <span className="text-xs text-muted-foreground">
                (Menampilkan dari {alertPuskesmasList.length} puskesmas pertama)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'BGM', count: allAlerts.filter(a => a.alertType === 'BGM').length, color: 'bg-rose-100 text-rose-800' },
              { label: 'Tidak Naik 2×', count: allAlerts.filter(a => a.alertType === '2T').length, color: 'bg-orange-100 text-orange-800' },
              { label: 'BB Turun', count: allAlerts.filter(a => a.alertType === 'BB_TURUN').length, color: 'bg-amber-100 text-amber-800' },
              { label: 'Tidak Datang', count: allAlerts.filter(a => a.alertType === 'TIDAK_DATANG').length, color: 'bg-slate-100 text-slate-700' },
            ].map(item => (
              <div key={item.label} className={`rounded-lg p-4 text-center ${item.color}`}>
                <p className="text-2xl font-bold tabular-nums">{item.count}</p>
                <p className="text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <AlertList alerts={allAlerts} />
        </CardContent>
      </Card>
    </div>
  )
}
