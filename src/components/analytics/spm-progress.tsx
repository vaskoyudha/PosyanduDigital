'use client'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

export interface SpmProgressProps {
  ds_pct: number
  vitA_pct?: number
  fe_pct?: number
  className?: string
}

interface Indicator {
  label: string
  target: number
  value: number
}

function progressColor(value: number, target: number): string {
  const ratio = value / target
  if (ratio >= 1) return 'bg-emerald-500'
  if (ratio >= 0.7) return 'bg-amber-400'
  return 'bg-rose-500'
}

function statusText(value: number, target: number): string {
  const ratio = value / target
  if (ratio >= 1) return 'Tercapai'
  if (ratio >= 0.7) return 'Mendekati'
  return 'Di Bawah Target'
}

function statusClass(value: number, target: number): string {
  const ratio = value / target
  if (ratio >= 1) return 'text-emerald-700'
  if (ratio >= 0.7) return 'text-amber-700'
  return 'text-rose-700'
}

export function SpmProgress({ ds_pct, vitA_pct, fe_pct, className }: SpmProgressProps) {
  const indicators: Indicator[] = [
    { label: 'D/S (Penimbangan)', target: 80, value: ds_pct },
  ]
  if (vitA_pct !== undefined) {
    indicators.push({ label: 'Vitamin A', target: 85, value: vitA_pct })
  }
  if (fe_pct !== undefined) {
    indicators.push({ label: 'Fe Ibu Hamil', target: 90, value: fe_pct })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {indicators.map(ind => {
        const clampedValue = Math.min(ind.value, 100)
        return (
          <div key={ind.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">
                {ind.label}{' '}
                <span className="text-xs font-normal text-muted-foreground">(Target: {ind.target}%)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold tabular-nums', statusClass(ind.value, ind.target))}>
                  {ind.value.toFixed(1)}%
                </span>
                <span className={cn('text-xs', statusClass(ind.value, ind.target))}>
                  {statusText(ind.value, ind.target)}
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress value={clampedValue} className="h-2.5" />
              {/* Target line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-400/70"
                style={{ left: `${ind.target}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
