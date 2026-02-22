'use client'

import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { EppgbmDataDasar, EppgbmPemantauan } from '@/lib/export/eppgbm-template'

interface EppgbmPreviewProps {
  posyanduId: string
  bulan: string
}

interface PreviewData {
  posyanduNama: string
  bulan: string
  dataDasar: EppgbmDataDasar[]
  pemantauan: EppgbmPemantauan[]
}

// Column definitions for Data Dasar
const dataDasarColumns: ColumnDef<EppgbmDataDasar>[] = [
  {
    accessorKey: 'nama_anak',
    header: 'Nama Anak',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nama_anak}</span>
    ),
  },
  {
    accessorKey: 'nik_anak',
    header: 'NIK',
    cell: ({ row }) => {
      const nik = row.original.nik_anak
      if (!nik) return <span className="text-amber-600 text-xs">Kosong</span>
      return <span className="font-mono text-xs">{nik}</span>
    },
  },
  {
    accessorKey: 'tanggal_lahir',
    header: 'Tgl Lahir',
  },
  {
    accessorKey: 'jenis_kelamin',
    header: 'JK',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.jenis_kelamin}
      </Badge>
    ),
  },
  {
    accessorKey: 'berat_lahir',
    header: 'BB Lahir (kg)',
    cell: ({ row }) => row.original.berat_lahir ?? '-',
  },
  {
    accessorKey: 'panjang_lahir',
    header: 'PB Lahir (cm)',
    cell: ({ row }) => row.original.panjang_lahir ?? '-',
  },
  {
    accessorKey: 'nama_ibu',
    header: 'Nama Ibu',
    cell: ({ row }) => row.original.nama_ibu ?? '-',
  },
]

// Column definitions for Pemantauan
const pemantauanColumns: ColumnDef<EppgbmPemantauan>[] = [
  {
    accessorKey: 'nama_anak',
    header: 'Nama Anak',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nama_anak}</span>
    ),
  },
  {
    accessorKey: 'tanggal_penimbangan',
    header: 'Tgl Penimbangan',
  },
  {
    accessorKey: 'berat_badan',
    header: 'BB (kg)',
    cell: ({ row }) => row.original.berat_badan ?? '-',
  },
  {
    accessorKey: 'tinggi_badan',
    header: 'TB (cm)',
    cell: ({ row }) => row.original.tinggi_badan ?? '-',
  },
  {
    accessorKey: 'lingkar_kepala',
    header: 'LK (cm)',
    cell: ({ row }) => row.original.lingkar_kepala ?? '-',
  },
  {
    accessorKey: 'status_bb_u',
    header: 'BB/U',
    cell: ({ row }) => {
      const s = row.original.status_bb_u
      if (!s) return '-'
      const color = s.includes('buruk') ? 'text-red-600' : s.includes('kurang') ? 'text-amber-600' : 'text-green-600'
      return <span className={`text-xs font-medium ${color}`}>{s}</span>
    },
  },
  {
    accessorKey: 'status_tb_u',
    header: 'TB/U',
    cell: ({ row }) => {
      const s = row.original.status_tb_u
      if (!s) return '-'
      const color = s.includes('pendek') ? 'text-red-600' : 'text-green-600'
      return <span className={`text-xs font-medium ${color}`}>{s}</span>
    },
  },
  {
    accessorKey: 'status_bb_tb',
    header: 'BB/TB',
    cell: ({ row }) => {
      const s = row.original.status_bb_tb
      if (!s) return '-'
      const color = s.includes('buruk') || s.includes('kurang') ? 'text-red-600' : s.includes('lebih') ? 'text-amber-600' : 'text-green-600'
      return <span className={`text-xs font-medium ${color}`}>{s}</span>
    },
  },
]

export function EppgbmPreview({ posyanduId, bulan }: Readonly<EppgbmPreviewProps>) {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)

    fetch(`/api/export/eppgbm/preview?posyandu_id=${posyanduId}&bulan=${bulan}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(err => {
        if (!cancelled) setError(err.message ?? 'Gagal memuat data pratinjau')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [posyanduId, bulan])

  const nikKosongCount = useMemo(() => {
    if (!data) return 0
    return data.dataDasar.filter(d => !d.nik_anak).length
  }, [data])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Memuat pratinjau...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            variant="error"
            title="Gagal memuat pratinjau"
            description={error}
          />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Pratinjau Data — {data.posyanduNama}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {data.dataDasar.length} anak
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {data.pemantauan.length} pengukuran
            </Badge>
          </div>
        </div>
        {nikKosongCount > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Ada {nikKosongCount} baris dengan NIK kosong
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="data-dasar">
          <TabsList>
            <TabsTrigger value="data-dasar">Data Dasar ({data.dataDasar.length})</TabsTrigger>
            <TabsTrigger value="pemantauan">Pemantauan ({data.pemantauan.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="data-dasar" className="mt-4">
            {data.dataDasar.length > 0 ? (
              <DataTable
                columns={dataDasarColumns}
                data={data.dataDasar}
                pageSize={10}
                emptyState={
                  <EmptyState
                    variant="generic"
                    title="Tidak ada data anak"
                    description="Belum ada anak terdaftar di posyandu ini."
                  />
                }
              />
            ) : (
              <EmptyState
                variant="generic"
                title="Tidak ada data anak"
                description="Belum ada anak terdaftar di posyandu ini."
              />
            )}
          </TabsContent>
          <TabsContent value="pemantauan" className="mt-4">
            {data.pemantauan.length > 0 ? (
              <DataTable
                columns={pemantauanColumns}
                data={data.pemantauan}
                pageSize={10}
                emptyState={
                  <EmptyState
                    variant="measurements"
                    title="Tidak ada pengukuran"
                    description="Belum ada pengukuran pada bulan ini."
                  />
                }
              />
            ) : (
              <EmptyState
                variant="measurements"
                title="Tidak ada pengukuran"
                description="Belum ada pengukuran pada bulan ini."
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
