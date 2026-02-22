'use client'

import * as React from 'react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Eye } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateIndonesian } from '@/lib/utils/date'
import { formatAgeIndonesian, ageInMonths } from '@/lib/utils/age'
import { cn } from '@/lib/utils'

type ChildRow = Database['public']['Tables']['children']['Row']

interface ChildWithLatest extends ChildRow {
  latest_status_bb_u?: string | null
  latest_status_tb_u?: string | null
  latest_umur_bulan?: number | null
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

const STATUS_BB_U_LABELS: Record<string, string> = {
  gizi_buruk: 'Gizi Buruk',
  gizi_kurang: 'Gizi Kurang',
  gizi_baik: 'Gizi Baik',
  gizi_lebih: 'Gizi Lebih',
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'gizi_buruk':  return 'bg-red-100 text-red-800 border-red-200'
    case 'gizi_kurang': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'gizi_baik':   return 'bg-green-100 text-green-800 border-green-200'
    case 'gizi_lebih':  return 'bg-orange-100 text-orange-800 border-orange-200'
    default:            return 'bg-muted text-muted-foreground'
  }
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: ColumnDef<ChildWithLatest>[] = [
  {
    accessorKey: 'nama',
    header: 'Nama Anak',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nama}</span>
    ),
  },
  {
    accessorKey: 'tanggal_lahir',
    header: 'Tgl Lahir',
    cell: ({ getValue }) => formatDateIndonesian(getValue<string>()),
  },
  {
    id: 'usia',
    header: 'Usia',
    cell: ({ row }) => {
      const months = ageInMonths(row.original.tanggal_lahir, new Date())
      return formatAgeIndonesian(months)
    },
  },
  {
    accessorKey: 'jenis_kelamin',
    header: 'JK',
    cell: ({ getValue }) => (
      <span>{getValue<string>() === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
    ),
  },
  {
    id: 'status_gizi',
    header: 'Status Gizi',
    cell: ({ row }) => {
      const status = row.original.latest_status_bb_u
      if (!status) return <span className="text-muted-foreground text-xs">-</span>
      return (
        <Badge
          variant="outline"
          className={cn('text-xs', statusBadgeClass(status))}
        >
          {STATUS_BB_U_LABELS[status] ?? status}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild className="h-7 px-2">
        <Link href={`/children/${row.original.id}`}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          Lihat
        </Link>
      </Button>
    ),
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChildrenPage() {
  const { posyandu_id, isLoading: userLoading } = useUser()
  const [children, setChildren] = React.useState<ChildWithLatest[]>([])
  const [filtered, setFiltered] = React.useState<ChildWithLatest[]>([])
  const [search, setSearch] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch children with latest measurement status
  React.useEffect(() => {
    if (userLoading) return
    if (!posyandu_id) {
      setIsLoading(false)
      return
    }

    async function fetchChildren() {
      setIsLoading(true)
      setError(null)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        // Fetch children for posyandu
        const { data: childrenData, error: childrenError } = await supabase
          .from('children')
          .select('*')
          .eq('posyandu_id', posyandu_id)
          .eq('is_active', true)
          .order('nama_normalized', { ascending: true })

        if (childrenError) {
          setError('Gagal memuat data anak. Silakan coba lagi.')
          return
        }

        if (!childrenData?.length) {
          setChildren([])
          setFiltered([])
          return
        }

        // Fetch latest measurement for each child (most recent by tanggal_pengukuran)
        const childIds = childrenData.map((c: ChildRow) => c.id)
        const { data: measurements } = await supabase
          .from('measurements')
          .select('child_id, status_bb_u, status_tb_u, umur_bulan, tanggal_pengukuran')
          .in('child_id', childIds)
          .order('tanggal_pengukuran', { ascending: false })

        // Build a map: child_id → latest measurement
        const latestMap = new Map<string, { status_bb_u: string | null; status_tb_u: string | null; umur_bulan: number }>()
        if (measurements) {
          for (const m of measurements) {
            if (!latestMap.has(m.child_id)) {
              latestMap.set(m.child_id, {
                status_bb_u: m.status_bb_u,
                status_tb_u: m.status_tb_u,
                umur_bulan: m.umur_bulan,
              })
            }
          }
        }

        const enriched: ChildWithLatest[] = childrenData.map((child: ChildRow) => {
          const latest = latestMap.get(child.id)
          return {
            ...child,
            latest_status_bb_u: latest?.status_bb_u,
            latest_status_tb_u: latest?.status_tb_u,
            latest_umur_bulan: latest?.umur_bulan,
          }
        })

        setChildren(enriched)
        setFiltered(enriched)
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchChildren()
  }, [posyandu_id, userLoading])

  // Client-side search filter
  React.useEffect(() => {
    if (!search.trim()) {
      setFiltered(children)
      return
    }
    const q = search.toLowerCase()
    setFiltered(
      children.filter(
        (c) =>
          c.nama.toLowerCase().includes(q) ||
          c.nama_normalized.toLowerCase().includes(q) ||
          (c.nama_ibu?.toLowerCase().includes(q) ?? false) ||
          (c.nik?.includes(q) ?? false),
      ),
    )
  }, [search, children])

  if (userLoading || isLoading) {
    return (
      <div className="space-y-4 p-6">
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Data Anak</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-brand-600 font-semibold">{children.length}</span> anak terdaftar di posyandu ini
            </p>
          </div>
          <Button asChild>
            <Link href="/children/new">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Anak
            </Link>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      {!error && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama anak, nama ibu, NIK..."
          className="max-w-sm"
        />
      )}

      {/* Table or empty state */}
      {!error && filtered.length === 0 && !isLoading ? (
        search ? (
          <EmptyState
            variant="search"
            description={`Tidak ada anak yang cocok dengan pencarian "${search}".`}
          />
        ) : (
          <EmptyState
            variant="children"
            action={{
              label: 'Daftarkan Anak Pertama',
              onClick: () => { window.location.href = '/children/new' },
            }}
          />
        )
      ) : (
        <div className="rounded-xl ring-1 ring-gray-100/80 border-0 shadow-sm bg-white overflow-hidden">
          <DataTable columns={columns} data={filtered} pageSize={25} />
        </div>
      )}
    </div>
  )
}
