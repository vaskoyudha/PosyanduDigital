import { cn } from '@/lib/utils'
import { Baby, SearchX, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type EmptyStateVariant = 'children' | 'measurements' | 'search' | 'error' | 'generic'

export interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const DEFAULTS: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; description: string }> = {
  children: {
    icon: <Baby className="h-12 w-12 text-muted-foreground/40" />,
    title: 'Belum ada data anak',
    description: 'Mulai tambahkan data anak untuk posyandu ini.',
  },
  measurements: {
    icon: <Baby className="h-12 w-12 text-muted-foreground/40" />,
    title: 'Belum ada data pengukuran',
    description: 'Tambahkan pengukuran pertama untuk anak ini.',
  },
  search: {
    icon: <SearchX className="h-12 w-12 text-muted-foreground/40" />,
    title: 'Tidak ada hasil',
    description: 'Tidak ada data yang cocok dengan pencarian Anda.',
  },
  error: {
    icon: <AlertCircle className="h-12 w-12 text-destructive/40" />,
    title: 'Terjadi kesalahan',
    description: 'Gagal memuat data. Silakan coba lagi.',
  },
  generic: {
    icon: <Baby className="h-12 w-12 text-muted-foreground/40" />,
    title: 'Tidak ada data',
    description: 'Belum ada data yang tersedia.',
  },
}

/**
 * Empty state component for list/table views.
 */
export function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const defaults = DEFAULTS[variant]

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {defaults.icon}
      <h3 className="mt-4 text-base font-semibold text-foreground">
        {title ?? defaults.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {description ?? defaults.description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-6"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
