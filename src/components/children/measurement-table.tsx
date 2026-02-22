'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import type { Database } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateIndonesian } from '@/lib/utils/date'
import { cn } from '@/lib/utils'

type MeasurementRow = Database['public']['Tables']['measurements']['Row']

export interface MeasurementTableProps {
  measurements: MeasurementRow[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

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

function statusBBUClass(status: string | null): string {
  switch (status) {
    case 'gizi_buruk':  return 'bg-red-100 text-red-800 border-red-200'
    case 'gizi_kurang': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'gizi_baik':   return 'bg-green-100 text-green-800 border-green-200'
    case 'gizi_lebih':  return 'bg-orange-100 text-orange-800 border-orange-200'
    default:            return 'bg-muted text-muted-foreground'
  }
}

function statusTBUClass(status: string | null): string {
  switch (status) {
    case 'sangat_pendek': return 'bg-red-100 text-red-800 border-red-200'
    case 'pendek':        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'normal':        return 'bg-green-100 text-green-800 border-green-200'
    case 'tinggi':        return 'bg-blue-100 text-blue-800 border-blue-200'
    default:              return 'bg-muted text-muted-foreground'
  }
}

function ntBadgeClass(status: string | null): string {
  if (status === 'N') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'T') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-muted text-muted-foreground'
}

function formatZScore(z: number | null): string {
  if (z === null) return '-'
  return z.toFixed(2)
}

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
): ColumnDef<MeasurementRow>[] {
  return [
    {
      accessorKey: 'tanggal_pengukuran',
      header: 'Tanggal',
      cell: ({ getValue }) => formatDateIndonesian(getValue<string>()),
    },
    {
      accessorKey: 'umur_bulan',
      header: 'Usia',
      cell: ({ getValue }) => {
        const months = getValue<number>()
        if (months < 12) return `${months} bln`
        const y = Math.floor(months / 12)
        const m = months % 12
        return m === 0 ? `${y} thn` : `${y}t ${m}b`
      },
    },
    {
      accessorKey: 'berat_badan_kg',
      header: 'BB (kg)',
      cell: ({ getValue }) => {
        const v = getValue<number | null>()
        return v !== null ? v.toFixed(2) : '-'
      },
    },
    {
      accessorKey: 'tinggi_badan_cm',
      header: 'TB (cm)',
      cell: ({ getValue }) => {
        const v = getValue<number | null>()
        return v !== null ? v.toFixed(1) : '-'
      },
    },
    {
      accessorKey: 'zscore_bb_u',
      header: 'Z BB/U',
      cell: ({ getValue }) => formatZScore(getValue<number | null>()),
    },
    {
      accessorKey: 'status_bb_u',
      header: 'Status Gizi',
      cell: ({ getValue }) => {
        const status = getValue<string | null>()
        if (!status) return <span className="text-muted-foreground">-</span>
        return (
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', statusBBUClass(status))}
          >
            {STATUS_BB_U_LABELS[status] ?? status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status_tb_u',
      header: 'Status TB',
      cell: ({ getValue }) => {
        const status = getValue<string | null>()
        if (!status) return <span className="text-muted-foreground">-</span>
        return (
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', statusTBUClass(status))}
          >
            {STATUS_TB_U_LABELS[status] ?? status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status_naik',
      header: 'N/T',
      cell: ({ getValue }) => {
        const status = getValue<string | null>()
        if (!status) return <span className="text-muted-foreground">-</span>
        return (
          <Badge
            variant="outline"
            className={cn('text-xs font-bold', ntBadgeClass(status))}
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'is_bgm',
      header: 'BGM',
      cell: ({ getValue, row }) => {
        const isBgm = getValue<boolean>()
        const is2t = row.original.is_2t
        if (isBgm) {
          return (
            <Badge variant="outline" className="text-xs font-bold bg-red-100 text-red-800 border-red-200">
              BGM
            </Badge>
          )
        }
        if (is2t) {
          return (
            <Badge variant="outline" className="text-xs font-bold bg-orange-100 text-orange-800 border-orange-200">
              2T
            </Badge>
          )
        }
        return <span className="text-muted-foreground text-xs">-</span>
      },
    },
    ...(onEdit || onDelete
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: MeasurementRow } }) => (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(row.original.id)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(row.original.id)}
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ),
          } satisfies ColumnDef<MeasurementRow>,
        ]
      : []),
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MeasurementTable({ measurements, onEdit, onDelete }: MeasurementTableProps) {
  // Sort descending by date (most recent first)
  const sorted = React.useMemo(
    () =>
      [...measurements].sort(
        (a, b) =>
          new Date(b.tanggal_pengukuran).getTime() -
          new Date(a.tanggal_pengukuran).getTime(),
      ),
    [measurements],
  )

  const columns = React.useMemo(
    () => buildColumns(onEdit, onDelete),
    [onEdit, onDelete],
  )

  return (
    <DataTable
      columns={columns}
      data={sorted}
      pageSize={10}
      emptyState={
        <div className="py-8 text-center text-sm text-muted-foreground">
          Belum ada data pengukuran.
        </div>
      }
    />
  )
}
