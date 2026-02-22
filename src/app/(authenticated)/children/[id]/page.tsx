'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, AlertCircle, User, Calendar, Users, MapPin, Baby } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { WhoGrowthChart, type ChartMeasurementPoint } from '@/components/charts/who-growth-chart'
import { MeasurementTable } from '@/components/children/measurement-table'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateIndonesian } from '@/lib/utils/date'
import { formatAgeIndonesian, ageInMonths, ageInDays } from '@/lib/utils/age'
import { cn } from '@/lib/utils'

type ChildRow = Database['public']['Tables']['children']['Row']
type MeasurementRow = Database['public']['Tables']['measurements']['Row']

// ─── Status badge helpers ─────────────────────────────────────────────────────

function statusBBUClass(status: string | null | undefined): string {
  switch (status) {
    case 'gizi_buruk':  return 'bg-red-100 text-red-800 border-red-200'
    case 'gizi_kurang': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'gizi_baik':   return 'bg-green-100 text-green-800 border-green-200'
    case 'gizi_lebih':  return 'bg-orange-100 text-orange-800 border-orange-200'
    default:            return 'bg-muted text-muted-foreground'
  }
}

function statusTBUClass(status: string | null | undefined): string {
  switch (status) {
    case 'sangat_pendek': return 'bg-red-100 text-red-800 border-red-200'
    case 'pendek':        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'normal':        return 'bg-green-100 text-green-800 border-green-200'
    case 'tinggi':        return 'bg-blue-100 text-blue-800 border-blue-200'
    default:              return 'bg-muted text-muted-foreground'
  }
}

const STATUS_BB_U_LABELS: Record<string, string> = {
  gizi_buruk: 'Gizi Buruk',
  gizi_kurang: 'Gizi Kurang',
  gizi_baik: 'Gizi Baik',
  gizi_lebih: 'Gizi Lebih',
}

const STATUS_TB_U_LABELS: Record<string, string> = {
  sangat_pendek: 'Sangat Pendek',
  pendek: 'Pendek',
  normal: 'Normal',
  tinggi: 'Tinggi',
}

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChildProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { posyandu_id, isLoading: userLoading } = useUser()

  const [child, setChild] = React.useState<ChildRow | null>(null)
  const [measurements, setMeasurements] = React.useState<MeasurementRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [chartType, setChartType] = React.useState<'wfa' | 'lhfa' | 'wfh'>('wfa')

  const childId = params.id

  // Fetch child + measurements
  React.useEffect(() => {
    if (userLoading) return
    if (!posyandu_id) {
      setIsLoading(false)
      return
    }

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        // Fetch child — enforce posyandu_id for security
        const { data: childData, error: childError } = await supabase
          .from('children')
          .select('*')
          .eq('id', childId)
          .eq('posyandu_id', posyandu_id)
          .single()

        if (childError || !childData) {
          setError('Data anak tidak ditemukan.')
          setIsLoading(false)
          return
        }

        setChild(childData as ChildRow)

        // Fetch all measurements for this child, oldest first
        const { data: measurementData, error: measurementError } = await supabase
          .from('measurements')
          .select('*')
          .eq('child_id', childId)
          .order('tanggal_pengukuran', { ascending: true })

        if (measurementError) {
          setError('Gagal memuat data pengukuran.')
          setIsLoading(false)
          return
        }

        setMeasurements((measurementData ?? []) as MeasurementRow[])
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [childId, posyandu_id, userLoading])

  // Build chart measurement points
  const chartPoints = React.useMemo((): ChartMeasurementPoint[] => {
    if (!child) return []
    return measurements
      .filter((m) => {
        if (chartType === 'wfa') return m.berat_badan_kg !== null
        if (chartType === 'lhfa') return m.tinggi_badan_cm !== null
        // wfh: need both weight and height
        return m.berat_badan_kg !== null && m.tinggi_badan_cm !== null
      })
      .map((m) => {
        const days = ageInDays(child.tanggal_lahir, m.tanggal_pengukuran)
        const months = ageInMonths(child.tanggal_lahir, m.tanggal_pengukuran)
        return {
          date: m.tanggal_pengukuran,
          ageDays: days,
          ageMonths: months,
          value: chartType === 'lhfa'
            ? (m.tinggi_badan_cm ?? 0)
            : (m.berat_badan_kg ?? 0),
          zscore: chartType === 'lhfa'
            ? m.zscore_tb_u
            : chartType === 'wfh'
              ? m.zscore_bb_tb
              : m.zscore_bb_u,
          status: chartType === 'lhfa'
            ? m.status_tb_u
            : chartType === 'wfh'
              ? m.status_bb_tb
              : m.status_bb_u,
          heightCm: m.tinggi_badan_cm ?? undefined,
        }
      })
  }, [child, measurements, chartType])

  // Latest measurement for summary cards
  const latestMeasurement = React.useMemo((): MeasurementRow | null => {
    if (!measurements.length) return null
    return [...measurements].sort(
      (a, b) =>
        new Date(b.tanggal_pengukuran).getTime() -
        new Date(a.tanggal_pengukuran).getTime(),
    )[0]
  }, [measurements])

  // ─── Loading / error states ──────────────────────────────────────────────────

  if (userLoading || isLoading) {
    return (
      <div className="space-y-4 p-6">
        <LoadingSkeleton rows={8} />
      </div>
    )
  }

  if (error || !child) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/children">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Link>
        </Button>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error ?? 'Data anak tidak ditemukan.'}</span>
        </div>
      </div>
    )
  }

  const currentAgeMonths = ageInMonths(child.tanggal_lahir, new Date())
  const sex = child.jenis_kelamin

  return (
    <div className="space-y-5 p-6">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/children">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/children/${childId}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit Data
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/children/${childId}/measure`}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah Pengukuran
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Child info card ── */}
      <div className="rounded-xl ring-1 ring-gray-100/80 border-0 shadow-sm bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{child.nama}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sex === 'L' ? 'Laki-laki' : 'Perempuan'} &bull;{' '}
              {formatAgeIndonesian(currentAgeMonths)} &bull;{' '}
              {formatDateIndonesian(child.tanggal_lahir)}
            </p>
          </div>
          {/* Latest status badges */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {latestMeasurement?.status_bb_u && (
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', statusBBUClass(latestMeasurement.status_bb_u))}
              >
                {STATUS_BB_U_LABELS[latestMeasurement.status_bb_u] ?? latestMeasurement.status_bb_u}
              </Badge>
            )}
            {latestMeasurement?.status_tb_u && (
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', statusTBUClass(latestMeasurement.status_tb_u))}
              >
                {STATUS_TB_U_LABELS[latestMeasurement.status_tb_u] ?? latestMeasurement.status_tb_u}
              </Badge>
            )}
          </div>
        </div>

        {/* Detail grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {child.nik && (
            <InfoRow
              icon={User}
              label="NIK"
              value={child.nik}
            />
          )}
          <InfoRow
            icon={Calendar}
            label="Tanggal Lahir"
            value={formatDateIndonesian(child.tanggal_lahir)}
          />
          {(child.berat_lahir_kg || child.panjang_lahir_cm) && (
            <InfoRow
              icon={Baby}
              label="Berat / Panjang Lahir"
              value={[
                child.berat_lahir_kg ? `${child.berat_lahir_kg} kg` : null,
                child.panjang_lahir_cm ? `${child.panjang_lahir_cm} cm` : null,
              ].filter(Boolean).join(' / ')}
            />
          )}
          {child.nama_ibu && (
            <InfoRow
              icon={Users}
              label="Nama Ibu"
              value={child.nama_ibu}
            />
          )}
          {child.nama_ayah && (
            <InfoRow
              icon={Users}
              label="Nama Ayah"
              value={child.nama_ayah}
            />
          )}
          {(child.alamat || child.rt || child.rw) && (
            <InfoRow
              icon={MapPin}
              label="Alamat"
              value={[
                child.alamat,
                child.rt ? `RT ${child.rt}` : null,
                child.rw ? `RW ${child.rw}` : null,
              ].filter(Boolean).join(', ')}
            />
          )}
        </div>

        {/* Last measurement summary */}
        {latestMeasurement && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pengukuran Terakhir</p>
              <p className="text-sm font-medium">{formatDateIndonesian(latestMeasurement.tanggal_pengukuran)}</p>
            </div>
            {latestMeasurement.berat_badan_kg !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Berat Badan</p>
                <p className="text-sm font-medium">{latestMeasurement.berat_badan_kg.toFixed(2)} kg</p>
              </div>
            )}
            {latestMeasurement.tinggi_badan_cm !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Tinggi Badan</p>
                <p className="text-sm font-medium">{latestMeasurement.tinggi_badan_cm.toFixed(1)} cm</p>
              </div>
            )}
            {latestMeasurement.status_naik && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Status N/T</p>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-sm font-bold',
                    latestMeasurement.status_naik === 'N'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  )}
                >
                  {latestMeasurement.status_naik}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Growth chart ── */}
      <div className="rounded-xl ring-1 ring-gray-100/80 border-0 shadow-sm bg-white p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-base font-semibold">Grafik Pertumbuhan (WHO)</h2>
          <Tabs
            value={chartType}
            onValueChange={(v) => setChartType(v as 'wfa' | 'lhfa' | 'wfh')}
          >
            <TabsList className="h-8">
              <TabsTrigger value="wfa" className="text-xs px-3">BB/U</TabsTrigger>
              <TabsTrigger value="lhfa" className="text-xs px-3">TB/U</TabsTrigger>
              <TabsTrigger value="wfh" className="text-xs px-3">BB/TB</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {chartPoints.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Belum ada data pengukuran untuk ditampilkan pada grafik ini.
          </div>
        ) : (
          <WhoGrowthChart
            chartType={chartType}
            sex={sex}
            measurements={chartPoints}
          />
        )}
      </div>

      {/* ── Measurement history ── */}
      <div className="rounded-xl ring-1 ring-gray-100/80 border-0 shadow-sm bg-white p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-base font-semibold">Riwayat Pengukuran</h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/children/${childId}/measure`}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah
            </Link>
          </Button>
        </div>

        <MeasurementTable
          measurements={measurements}
          onEdit={(id) => router.push(`/children/${childId}/measure?edit=${id}`)}
          onDelete={async (id) => {
            if (!confirm('Hapus data pengukuran ini?')) return
            try {
              const res = await fetch(`/api/measurements/${id}`, { method: 'DELETE' })
              if (res.ok) {
                setMeasurements((prev) => prev.filter((m) => m.id !== id))
              } else {
                alert('Gagal menghapus pengukuran.')
              }
            } catch {
              alert('Terjadi kesalahan saat menghapus.')
            }
          }}
        />
      </div>
    </div>
  )
}
