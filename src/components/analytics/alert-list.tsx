'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef, CellContext } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { AlertChild, AlertType } from '@/lib/analytics/alerts'

export interface AlertListProps {
  alerts: AlertChild[]
  onRowClick?: (childId: string) => void
}

const ALERT_LABELS: Record<AlertType, string> = {
  BGM: 'Bawah Garis Merah',
  '2T': 'Tidak Naik 2 Bulan',
  BB_TURUN: 'BB Turun',
  TIDAK_DATANG: 'Tidak Datang',
}

const ALERT_CLASS: Record<AlertType, string> = {
  BGM: 'bg-rose-100 text-rose-800 border border-rose-200',
  '2T': 'bg-orange-100 text-orange-800 border border-orange-200',
  BB_TURUN: 'bg-amber-100 text-amber-800 border border-amber-200',
  TIDAK_DATANG: 'bg-slate-100 text-slate-700 border border-slate-200',
}

function buildColumns(onNavigate: (id: string) => void): ColumnDef<AlertChild>[] {
  return [
    {
      accessorKey: 'nama',
      header: 'Nama Anak',
      cell: ({ row }: CellContext<AlertChild, unknown>) => (
        <button
          className="font-medium text-sm text-left hover:underline"
          onClick={() => onNavigate(row.original.childId)}
        >
          {row.original.nama}
        </button>
      ),
    },
    {
      accessorKey: 'usiaBulan',
      header: 'Usia',
      cell: ({ row }: CellContext<AlertChild, unknown>) => (
        <span className="text-sm tabular-nums">{row.original.usiaBulan} bln</span>
      ),
    },
    {
      accessorKey: 'posyanduNama',
      header: 'Posyandu',
      cell: ({ row }: CellContext<AlertChild, unknown>) => (
        <span className="text-sm text-muted-foreground">{row.original.posyanduNama}</span>
      ),
    },
    {
      accessorKey: 'alertType',
      header: 'Status',
      cell: ({ row }: CellContext<AlertChild, unknown>) => {
        const type = row.original.alertType
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ALERT_CLASS[type]}`}>
            {ALERT_LABELS[type]}
          </span>
        )
      },
    },
    {
      accessorKey: 'bbTerakhir',
      header: 'BB Terakhir',
      cell: ({ row }: CellContext<AlertChild, unknown>) => (
        <span className="text-sm tabular-nums">
          {row.original.bbTerakhir != null ? `${row.original.bbTerakhir} kg` : '–'}
        </span>
      ),
    },
    {
      accessorKey: 'hariBelumTimbang',
      header: 'Hari Sejak Timbang',
      enableSorting: true,
      cell: ({ row }: CellContext<AlertChild, unknown>) => {
        const hari = row.original.hariBelumTimbang
        const cls = hari > 90 ? 'text-rose-600' : hari > 60 ? 'text-amber-600' : 'text-muted-foreground'
        return (
          <span className={`text-sm tabular-nums font-medium ${cls}`}>
            {hari >= 999 ? '–' : `${hari} hari`}
          </span>
        )
      },
    },
  ]
}

export function AlertList({ alerts, onRowClick }: AlertListProps) {
  const router = useRouter()

  const handleNavigate = React.useCallback((childId: string) => {
    if (onRowClick) {
      onRowClick(childId)
    } else {
      router.push(`/children/${childId}`)
    }
  }, [onRowClick, router])

  const columns = React.useMemo(() => buildColumns(handleNavigate), [handleNavigate])

  return (
    <DataTable
      columns={columns}
      data={alerts}
      pageSize={10}
      emptyState={
        <EmptyState
          variant="generic"
          title="Tidak ada anak berisiko"
          description="Semua anak dalam kondisi baik bulan ini."
        />
      }
    />
  )
}
