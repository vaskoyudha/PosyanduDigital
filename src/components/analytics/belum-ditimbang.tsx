'use client'

import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import type { AlertChild } from '@/lib/analytics/alerts'

export interface BelumDitimbangProps {
  posyanduId: string
  bulan: string  // YYYY-MM
}

export function BelumDitimbang({ posyanduId, bulan }: BelumDitimbangProps) {
  const [data, setData] = React.useState<AlertChild[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!posyanduId) return
    setLoading(true)
    fetch(`/api/analytics/alerts?posyandu_id=${posyanduId}&bulan=${bulan}`)
      .then(res => res.json())
      .then(json => {
        setData(json.belum_ditimbang ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Gagal memuat data')
        setLoading(false)
      })
  }, [posyanduId, bulan])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState variant="error" title={error} />
  }

  if (data.length === 0) {
    return (
      <EmptyState
        variant="generic"
        title="Semua anak sudah ditimbang"
        description={`Tidak ada anak yang belum ditimbang bulan ${bulan}.`}
      />
    )
  }

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {data.map(child => (
        <div
          key={child.childId}
          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{child.nama}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {child.usiaBulan} bln
              {child.tanggalTerakhir && (
                <> · Terakhir: {format(new Date(child.tanggalTerakhir), 'd MMM yyyy', { locale: idLocale })}</>
              )}
              {!child.tanggalTerakhir && ' · Belum pernah ditimbang'}
            </p>
          </div>
          <Link
            href={`/children/${child.childId}/measure`}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Catat Timbang
          </Link>
        </div>
      ))}
    </div>
  )
}
