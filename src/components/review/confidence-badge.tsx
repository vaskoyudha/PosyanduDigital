'use client'

import * as React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ConfidenceBadgeProps {
  confidence: number | null
  className?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfidenceLevel(confidence: number | null): 'high' | 'medium' | 'low' | 'unknown' {
  if (confidence === null) return 'unknown'
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.65) return 'medium'
  return 'low'
}

const LEVEL_STYLES = {
  high:    { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium', dot: 'bg-emerald-500' },
  medium:  { badge: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',       dot: 'bg-amber-400'  },
  low:     { badge: 'bg-rose-50 text-rose-700 border border-rose-200 font-medium',           dot: 'bg-rose-500'   },
  unknown: { badge: 'bg-gray-50 text-gray-500 border border-gray-200 font-medium',           dot: 'bg-gray-400'   },
} as const

const LEVEL_LABELS = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  unknown: 'N/A',
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence)
  const pctText = confidence !== null ? `${Math.round(confidence * 100)}%` : '?'
  const tooltipText =
    confidence !== null
      ? `Keyakinan OCR: ${Math.round(confidence * 100)}% (${LEVEL_LABELS[level]})`
      : 'Keyakinan tidak tersedia'

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
              'cursor-default select-none transition-colors',
              LEVEL_STYLES[level].badge,
              className
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', LEVEL_STYLES[level].dot)} />
            {pctText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
