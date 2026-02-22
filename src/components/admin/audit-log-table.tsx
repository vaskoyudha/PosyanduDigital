'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export interface AuditLogEntry {
  id: string
  user_id: string | null
  user_role: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface AuditLogTableProps {
  logs: AuditLogEntry[]
}

const ACTION_LABELS: Record<string, string> = {
  VIEW_CHILD: 'Lihat Anak',
  CREATE_CHILD: 'Tambah Anak',
  EDIT_CHILD: 'Edit Anak',
  DELETE_CHILD: 'Hapus Anak',
  VIEW_MEASUREMENT: 'Lihat Pengukuran',
  CREATE_MEASUREMENT: 'Tambah Pengukuran',
  EDIT_MEASUREMENT: 'Edit Pengukuran',
  DELETE_MEASUREMENT: 'Hapus Pengukuran',
  VIEW_OCR: 'Lihat OCR',
  APPROVE_OCR: 'Setujui OCR',
  COMMIT_OCR: 'Komit OCR',
  EXPORT_DATA: 'Ekspor Data',
  VIEW_AUDIT_LOG: 'Lihat Log Audit',
}

const ROLE_LABELS: Record<string, string> = {
  kader: 'Kader',
  bidan: 'Bidan',
  tpg: 'TPG',
  kepala_puskesmas: 'Kepala',
  dinas: 'Dinas',
  admin: 'Admin',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  EDIT: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  VIEW: 'bg-gray-100 text-gray-700 border-gray-200',
  EXPORT: 'bg-purple-100 text-purple-700 border-purple-200',
  COMMIT: 'bg-orange-100 text-orange-700 border-orange-200',
  APPROVE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color
  }
  return ACTION_COLORS.VIEW
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const ALL_ACTIONS = [
  'VIEW_CHILD', 'CREATE_CHILD', 'EDIT_CHILD', 'DELETE_CHILD',
  'VIEW_MEASUREMENT', 'CREATE_MEASUREMENT', 'EDIT_MEASUREMENT', 'DELETE_MEASUREMENT',
  'VIEW_OCR', 'APPROVE_OCR', 'COMMIT_OCR',
  'EXPORT_DATA', 'VIEW_AUDIT_LOG',
]

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: 'created_at',
    header: 'Waktu',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(row.original.created_at)}
      </span>
    ),
  },
  {
    accessorKey: 'user_id',
    header: 'User ID',
    cell: ({ row }) => (
      <span className="text-xs font-mono truncate max-w-[80px] block">
        {row.original.user_id?.slice(0, 8) ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'user_role',
    header: 'Peran',
    cell: ({ row }) => {
      const role = row.original.user_role
      return role ? (
        <Badge variant="outline" className="text-xs">
          {ROLE_LABELS[role] ?? role}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: 'action',
    header: 'Aksi',
    cell: ({ row }) => {
      const action = row.original.action
      return (
        <Badge variant="outline" className={`text-xs ${getActionColor(action)}`}>
          {ACTION_LABELS[action] ?? action}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'resource_type',
    header: 'Tipe',
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.resource_type ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'resource_id',
    header: 'ID Sumber',
    cell: ({ row }) => (
      <span className="text-xs font-mono truncate max-w-[80px] block">
        {row.original.resource_id?.slice(0, 8) ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'ip_address',
    header: 'IP',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.ip_address ?? '-'}
      </span>
    ),
  },
]

export function AuditLogTable({ logs }: Readonly<AuditLogTableProps>) {
  const [filterAction, setFilterAction] = React.useState<string>('all')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')

  const filteredLogs = React.useMemo(() => {
    let result = logs

    if (filterAction !== 'all') {
      result = result.filter((log) => log.action === filterAction)
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom + 'T00:00:00')
      result = result.filter((log) => new Date(log.created_at) >= fromDate)
    }

    if (dateTo) {
      const toDate = new Date(dateTo + 'T23:59:59')
      result = result.filter((log) => new Date(log.created_at) <= toDate)
    }

    return result
  }, [logs, filterAction, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Jenis Aksi</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Semua aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  {ALL_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action] ?? action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredLogs.length} dari {logs.length} entri log
        </p>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        pageSize={25}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada log audit</p>
          </div>
        }
      />
    </div>
  )
}
