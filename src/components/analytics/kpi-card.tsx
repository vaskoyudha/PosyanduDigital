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

const iconBg: Record<KpiColor, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  yellow: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  neutral: 'bg-slate-50 text-slate-500',
}

const valueFg: Record<KpiColor, string> = {
  green: 'text-gray-900',
  yellow: 'text-gray-900',
  red: 'text-gray-900',
  neutral: 'text-gray-900',
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
    <Card className={cn('shadow-sm hover:shadow-md transition-all duration-200 border-0 bg-white ring-1 ring-gray-100/80', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-tight truncate">
              {title}
            </p>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={cn('text-3xl font-bold tabular-nums leading-none tracking-tight', valueFg[color])}>
                {value}
              </span>
              {unit && (
                <span className="text-sm font-medium text-muted-foreground">{unit}</span>
              )}
            </div>
            {trend !== undefined && (
              <div className={cn(
                'mt-2 flex items-center gap-1 text-xs font-medium',
                trendPositive && 'text-emerald-600',
                trendNegative && 'text-rose-500',
                !trendPositive && !trendNegative && 'text-muted-foreground'
              )}>
                <TrendIcon className="h-3 w-3" />
                <span>{trendPositive ? '+' : ''}{trend.toFixed(1)}%</span>
                {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
              iconBg[color]
            )}>
              {icon}
            </div>
          )}
        </div>
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
