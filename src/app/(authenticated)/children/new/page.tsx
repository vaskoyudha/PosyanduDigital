'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ChildForm } from '@/components/children/child-form'
import { Button } from '@/components/ui/button'

export default function NewChildPage() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link href="/children">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali
          </Link>
        </Button>
      </div>

      {/* Page title */}
      <div className="border-b border-gray-100 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Daftarkan Anak Baru</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Isi data anak dan persetujuan orang tua/wali sesuai UU PDP.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl ring-1 ring-gray-100/80 border-0 shadow-sm bg-white p-6">
        <ChildForm
          onSuccess={(childId) => {
            router.push(`/children/${childId}`)
          }}
        />
      </div>
    </div>
  )
}
