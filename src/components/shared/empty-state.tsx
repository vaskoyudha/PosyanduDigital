import { cn } from '@/lib/utils'
import { Baby, FileText, SearchX, AlertCircle, Inbox } from 'lucide-react'

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

type VariantConfig = {
  icon: React.ElementType
  color: string
  bg: string
  title: string
  description: string
}

const VARIANT_CONFIG: Record<EmptyStateVariant, VariantConfig> = {
  children: {
    icon: Baby,
    color: 'text-brand-400',
    bg: 'bg-brand-50',
    title: 'Belum ada data anak',
    description: 'Mulai tambahkan data anak untuk posyandu ini.',
  },
  measurements: {
    icon: FileText,
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    title: 'Belum ada data pengukuran',
    description: 'Tambahkan pengukuran pertama untuk anak ini.',
  },
  search: {
    icon: SearchX,
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    title: 'Tidak ada hasil',
    description: 'Tidak ada data yang cocok dengan pencarian Anda.',
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-50',
    title: 'Terjadi kesalahan',
    description: 'Gagal memuat data. Silakan coba lagi.',
  },
  generic: {
    icon: Inbox,
    color: 'text-gray-400',
    bg: 'bg-gray-50',
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
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl mb-4', config.bg)}>
        <Icon className={cn('h-8 w-8', config.color)} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mt-1">
        {title ?? config.title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs" style={{ textWrap: 'balance' } as React.CSSProperties}>
        {description ?? config.description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
