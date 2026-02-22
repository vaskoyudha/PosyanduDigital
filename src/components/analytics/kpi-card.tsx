'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type KpiColor = 'green' | 'yellow' | 'red' | 'neutral'

export interface KpiCardProps {
  title: string
  value: number | string
  unit?: string
  trend?: number         // e.g. +2.3 or -1.2
  trendLabel?: string
  color?: KpiColor
  icon?: React.ReactNode
  tooltip?: string
  className?: string
}

const borderColors: Record<KpiColor, string> = {
  green: 'border-l-emerald-500',
  yellow: 'border-l-amber-400',
  red: 'border-l-rose-500',
  neutral: 'border-l-slate-300',
}

const valueBg: Record<KpiColor, string> = {
  green: 'text-emerald-700',
  yellow: 'text-amber-700',
  red: 'text-rose-700',
  neutral: 'text-slate-700',
}

export function KpiCard({
  title,
  value,
  unit,
  trend,
  trendLabel,
  color = 'neutral',
  icon,
  tooltip,
  className,
}: KpiCardProps) {
  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0
  const TrendIcon = trendPositive ? TrendingUp : trendNegative ? TrendingDown : Minus

  const card = (
    <Card
      className={cn(
        'border-l-4 shadow-sm hover:shadow-md transition-shadow',
        borderColors[color],
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-tight">
            {title}
          </p>
          {icon && (
            <span className="text-muted-foreground/60 shrink-0">{icon}</span>
          )}
        </div>

        <div className="mt-3 flex items-end gap-1">
          <span className={cn('text-3xl font-bold tabular-nums leading-none', valueBg[color])}>
            {value}
          </span>
          {unit && (
            <span className="mb-0.5 text-sm font-medium text-muted-foreground">{unit}</span>
          )}
        </div>

        {trend !== undefined && (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              trendPositive && 'text-emerald-600',
              trendNegative && 'text-rose-500',
              !trendPositive && !trendNegative && 'text-muted-foreground'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>
              {trendPositive ? '+' : ''}{trend.toFixed(1)}%
            </span>
            {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="max-w-xs text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return card
}
