'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { MeasurementForm } from '@/components/children/measurement-form'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'

type ChildRow = Database['public']['Tables']['children']['Row']

export default function AddMeasurementPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { posyandu_id, isLoading: userLoading } = useUser()

  const [child, setChild] = React.useState<ChildRow | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const childId = params.id

  React.useEffect(() => {
    if (userLoading) return
    if (!posyandu_id) {
      setIsLoading(false)
      return
    }

    async function fetchChild() {
      setIsLoading(true)
      setError(null)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        const { data, error: fetchError } = await supabase
          .from('children')
          .select('id, nama, tanggal_lahir, jenis_kelamin, posyandu_id')
          .eq('id', childId)
          .eq('posyandu_id', posyandu_id)
          .single()

        if (fetchError || !data) {
          setError('Data anak tidak ditemukan.')
        } else {
          setChild(data as ChildRow)
        }
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchChild()
  }, [childId, posyandu_id, userLoading])

  if (userLoading || isLoading) {
    return (
      <div className="space-y-4 p-6">
        <LoadingSkeleton rows={6} />
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

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/children/${childId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Tambah Pengukuran</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{child.nama}</p>
        </div>
      </div>

      {/* Form */}
      <MeasurementForm
        childId={childId}
        tanggalLahir={child.tanggal_lahir}
        onSuccess={() => router.push(`/children/${childId}`)}
      />
    </div>
  )
}
