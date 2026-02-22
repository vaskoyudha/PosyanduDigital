import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateSKDN } from '@/lib/analytics/skdn'
import { getAlerts } from '@/lib/analytics/alerts'
import { KpiCard } from '@/components/analytics/kpi-card'
import { AlertList } from '@/components/analytics/alert-list'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardPlus, AlertTriangle, Scale, TrendingUp } from 'lucide-react'
import type { KpiColor } from '@/components/analytics/kpi-card'

/* eslint-disable @typescript-eslint/no-explicit-any */

const currentMonth = () => new Date().toISOString().slice(0, 7)

function dsColor(pct: number): KpiColor {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'yellow'
  return 'red'
}

export default async function DashboardBidanPage() {
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

  let posyanduNama = 'Posyandu'
  if (posyanduId) {
    const { data: pData } = await (supabase as any)
      .from('posyandu')
      .select('nama')
      .eq('id', posyanduId)
      .maybeSingle()
    posyanduNama = pData?.nama ?? posyanduNama
  }

  const skdn = posyanduId
    ? await calculateSKDN(supabase as any, posyanduId, bulan)
    : null

  // Alerts for this posyandu's puskesmas scope, filtered to this posyandu
  const allAlerts = puskesmasId
    ? await getAlerts(supabase as any, puskesmasId)
    : []
  const alerts = posyanduId
    ? allAlerts.filter(a => a.posyanduId === posyanduId)
    : allAlerts

  const bgmCount = alerts.filter(a => a.alertType === 'BGM').length
  const twoTCount = alerts.filter(a => a.alertType === '2T').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Bidan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {posyanduNama} · {bulan}
          </p>
        </div>
        <Link
          href="/children/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ClipboardPlus className="h-3.5 w-3.5" />
          Tambah Pengukuran
        </Link>
      </div>

      {!posyanduId && (
        <EmptyState
          variant="generic"
          title="Posyandu belum ditetapkan"
          description="Hubungi administrator untuk menetapkan posyandu Anda."
        />
      )}

      {skdn && (
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
          />
          <KpiCard
            title="Total Peringatan"
            value={alerts.length}
            unit="anak"
            color={alerts.length === 0 ? 'green' : alerts.length <= 3 ? 'yellow' : 'red'}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Alert Inbox */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">Anak Berisiko</CardTitle>
            <div className="flex gap-2">
              {bgmCount > 0 && (
                <Badge className="bg-rose-100 text-rose-800 border border-rose-200">
                  {bgmCount} BGM
                </Badge>
              )}
              {twoTCount > 0 && (
                <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                  {twoTCount} 2T
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AlertList alerts={alerts} />
        </CardContent>
      </Card>

      {/* Quick Posyandu Summary */}
      {skdn && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Ringkasan Posyandu</CardTitle>
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
      )}
    </div>
  )
}
