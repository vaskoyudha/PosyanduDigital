'use client'

import React from 'react'
import type { ColumnDef, CellContext } from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Sparkline } from '@/components/analytics/sparkline'
import { cn } from '@/lib/utils'
import type { SKDNData } from '@/lib/analytics/skdn'

export interface PosyanduRow {
  posyanduId: string
  posyanduNama: string
  S: number
  D: number
  N: number
  BGM: number
  twoT: number
  stunting_pct: number
  ds_pct: number
  nd_pct: number
  trend6m: number[]  // last 6 D/S values for sparkline
}

export interface PosyanduTableProps {
  puskesmasId: string
  bulan: string  // YYYY-MM
}

function dsPctClass(pct: number) {
  if (pct >= 80) return 'text-emerald-700 font-semibold'
  if (pct >= 50) return 'text-amber-700 font-semibold'
  return 'text-rose-700 font-semibold'
}

const columns: ColumnDef<PosyanduRow>[] = [
  {
    accessorKey: 'posyanduNama',
    header: 'Posyandu',
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className="font-medium text-sm">{row.original.posyanduNama}</span>
    ),
  },
  {
    accessorKey: 'S',
    header: 'S',
    enableSorting: true,
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className="text-sm tabular-nums">{row.original.S}</span>
    ),
  },
  {
    accessorKey: 'D',
    header: 'D',
    enableSorting: true,
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className="text-sm tabular-nums">{row.original.D}</span>
    ),
  },
  {
    accessorKey: 'ds_pct',
    header: 'D/S (%)',
    enableSorting: true,
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className={cn('text-sm tabular-nums', dsPctClass(row.original.ds_pct))}>
        {row.original.ds_pct.toFixed(1)}%
      </span>
    ),
  },
  {
    accessorKey: 'nd_pct',
    header: 'N/D (%)',
    enableSorting: true,
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className={cn('text-sm tabular-nums', row.original.nd_pct >= 70 ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium')}>
        {row.original.nd_pct.toFixed(1)}%
      </span>
    ),
  },
  {
    accessorKey: 'BGM',
    header: 'BGM',
    enableSorting: true,
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className={cn('text-sm tabular-nums', row.original.BGM > 0 ? 'text-rose-600 font-semibold' : 'text-muted-foreground')}>
        {row.original.BGM}
      </span>
    ),
  },
  {
    accessorKey: 'stunting_pct',
    header: 'Stunting (%)',
    enableSorting: true,
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <span className={cn('text-sm tabular-nums', row.original.stunting_pct > 20 ? 'text-rose-600 font-semibold' : 'text-muted-foreground')}>
        {row.original.stunting_pct.toFixed(1)}%
      </span>
    ),
  },
  {
    id: 'trend',
    header: 'Tren 6 Bln',
    cell: ({ row }: CellContext<PosyanduRow, unknown>) => (
      <Sparkline data={row.original.trend6m} height={36} className="w-20" />
    ),
  },
]

export function PosyanduTable({ puskesmasId, bulan }: PosyanduTableProps) {
  const [rows, setRows] = React.useState<PosyanduRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!puskesmasId) return
    setLoading(true)

    // Fetch SKDN for each posyandu (via puskesmas-level SKDN endpoint)
    // and prevalence per posyandu
    Promise.all([
      fetch(`/api/analytics/skdn?puskesmas_id=${puskesmasId}&bulan=${bulan}&months=6`).then(r => r.json()),
      fetch(`/api/analytics/prevalence?scope=puskesmas&id=${puskesmasId}&bulan=${bulan}`).then(r => r.json()),
    ])
      .then(([skdnResult, prevResult]) => {
        // skdnResult may not return per-posyandu data from the simple SKDN API
        // The posyandu comparison comes from prevalence endpoint
        const posyanduList = prevResult.posyandu_list ?? []

        const tableRows: PosyanduRow[] = posyanduList.map((p: {
          scopeId: string
          scopeName?: string
          stunting_pct: number
          total_measured: number
        }) => ({
          posyanduId: p.scopeId,
          posyanduNama: p.scopeName ?? p.scopeId,
          S: 0,
          D: p.total_measured,
          N: 0,
          BGM: 0,
          twoT: 0,
          stunting_pct: p.stunting_pct,
          ds_pct: 0,
          nd_pct: 0,
          trend6m: [],
        }))

        setRows(tableRows)
        setLoading(false)
      })
      .catch(() => {
        setError('Gagal memuat data posyandu')
        setLoading(false)
      })
  }, [puskesmasId, bulan])

  // Fetch per-posyandu SKDN data separately for accurate D/S, N/D
  React.useEffect(() => {
    if (!rows.length) return

    Promise.all(
      rows.map(async row => {
        try {
          const res = await fetch(
            `/api/analytics/skdn?posyandu_id=${row.posyanduId}&bulan=${bulan}&months=6`
          )
          const data = await res.json()
          const current: SKDNData = data.current ?? {}
          const trend: SKDNData[] = data.trend ?? []
          return {
            ...row,
            S: current.S ?? row.S,
            D: current.D ?? row.D,
            N: current.N ?? row.N,
            BGM: current.BGM ?? row.BGM,
            twoT: current.twoT ?? row.twoT,
            ds_pct: current.ds_pct ?? row.ds_pct,
            nd_pct: current.nd_pct ?? row.nd_pct,
            trend6m: trend.map((t: SKDNData) => t.ds_pct),
          }
        } catch {
          return row
        }
      })
    ).then(updated => setRows(updated))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, bulan])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState variant="error" title={error} />
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      pageSize={10}
      emptyState={
        <EmptyState
          variant="generic"
          title="Belum ada data posyandu"
          description="Belum ada posyandu yang terdaftar untuk puskesmas ini."
        />
      }
    />
  )
}
