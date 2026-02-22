import { cn } from '@/lib/utils'

export interface LoadingSkeletonProps {
  rows?: number
  className?: string
}

// Staggered width sets for organic feel — cycles through per row index
const ROW_WIDTHS = [
  { name: 'w-[52%]', date: 'w-[18%]', num: 'w-[10%]', badge: 'w-[14%]' },
  { name: 'w-[44%]', date: 'w-[20%]', num: 'w-[12%]', badge: 'w-[16%]' },
  { name: 'w-[60%]', date: 'w-[16%]', num: 'w-[9%]',  badge: 'w-[13%]' },
  { name: 'w-[38%]', date: 'w-[22%]', num: 'w-[11%]', badge: 'w-[15%]' },
  { name: 'w-[55%]', date: 'w-[17%]', num: 'w-[10%]', badge: 'w-[14%]' },
]

/**
 * Generic loading skeleton for list/table views.
 */
export function LoadingSkeleton({ rows = 5, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-2 p-1', className)}>
      {/* Header skeleton */}
      <div className="flex gap-3 mb-3">
        <div className="h-9 w-44 rounded-lg bg-gray-200/70 animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-gray-200/70 animate-pulse ml-auto" />
      </div>
      {/* Table header */}
      <div className="flex gap-4 py-2 px-1">
        <div className="h-3 w-32 rounded-full bg-gray-200/60 animate-pulse" />
        <div className="h-3 w-20 rounded-full bg-gray-200/60 animate-pulse" />
        <div className="h-3 w-16 rounded-full bg-gray-200/60 animate-pulse" />
        <div className="h-3 w-20 rounded-full bg-gray-200/60 animate-pulse" />
        <div className="h-3 w-24 rounded-full bg-gray-200/60 animate-pulse" />
      </div>
      {/* Rows — staggered widths for organic look */}
      {Array.from({ length: rows }).map((_, i) => {
        const w = ROW_WIDTHS[i % ROW_WIDTHS.length]
        return (
          <div
            key={i}
            className="flex items-center gap-3 py-2.5 px-1 border-b border-gray-100/80 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Avatar/icon placeholder */}
            <div className="h-8 w-8 rounded-lg bg-gray-200/70 shrink-0" />
            {/* Name + sub */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className={cn('h-3 rounded-full bg-gray-200/70', w.name)} />
              <div className={cn('h-2.5 rounded-full bg-gray-100/80', w.date)} />
            </div>
            {/* Numeric col */}
            <div className={cn('h-3 rounded-full bg-gray-200/70 shrink-0', w.num)} />
            {/* Badge placeholder */}
            <div className={cn('h-6 rounded-md bg-gray-200/70 shrink-0', w.badge)} />
            {/* Action */}
            <div className="h-7 w-16 rounded-md bg-gray-200/70 shrink-0 ml-1" />
          </div>
        )
      })}
    </div>
  )
}

/**
 * Card loading skeleton.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-6 ring-1 ring-gray-100/80 border-0 shadow-sm rounded-xl bg-white animate-pulse', className)}>
      <div className="h-5 w-1/3 rounded-full bg-gray-200/70" />
      <div className="space-y-2">
        <div className="h-3.5 w-2/3 rounded-full bg-gray-200/60" />
        <div className="h-3.5 w-1/2 rounded-full bg-gray-200/60" />
        <div className="h-3.5 w-3/4 rounded-full bg-gray-100/80" />
      </div>
    </div>
  )
}

/**
 * Form loading skeleton.
 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  const fieldWidths = ['w-20', 'w-28', 'w-24', 'w-32', 'w-20', 'w-26']
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className={cn('h-3.5 rounded-full bg-gray-200/70', fieldWidths[i % fieldWidths.length])} />
          <div className="h-9 w-full rounded-lg bg-gray-200/60" />
        </div>
      ))}
      <div className="h-10 w-32 rounded-lg bg-gray-200/70 animate-pulse" />
    </div>
  )
}
