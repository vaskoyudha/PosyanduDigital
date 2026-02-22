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
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100',
  low: 'bg-red-50 text-red-700 border-red-200 ring-red-100',
  unknown: 'bg-gray-50 text-gray-500 border-gray-200 ring-gray-100',
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
              'inline-flex items-center justify-center rounded border px-1.5 py-0.5',
              'text-[10px] font-semibold tabular-nums leading-none',
              'cursor-default select-none transition-colors',
              LEVEL_STYLES[level],
              className
            )}
          >
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
