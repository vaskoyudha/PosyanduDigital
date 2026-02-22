'use client'

import * as React from 'react'
import type { ExtractedRow } from '@/types/ocr'
import { useReviewStore } from '@/stores/review-store'
import { ReviewRow } from './review-row'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReviewPanelProps {
  rows: ExtractedRow[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewPanel({ rows }: ReviewPanelProps) {
  const { approvedRows, selectedRowId } = useReviewStore()
  const listRef = React.useRef<HTMLDivElement>(null)
  const rowRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  const approvedCount = approvedRows.size
  const totalCount = rows.length

  // Auto-scroll to selected row
  React.useEffect(() => {
    if (!selectedRowId) return
    const el = rowRefs.current.get(selectedRowId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedRowId])

  return (
    <div className="flex flex-col h-full">
      {/* Stats header */}
      <div className="flex-none px-3 py-2 border-b bg-gray-50/80 text-xs text-gray-500">
        <span className="font-semibold text-gray-700">{approvedCount}</span>
        {' '}dari{' '}
        <span className="font-semibold text-gray-700">{totalCount}</span>
        {' '}baris disetujui
      </div>

      {/* Scrollable list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            Tidak ada baris yang diekstrak.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              ref={(el) => {
                if (el) rowRefs.current.set(row.id, el)
                else rowRefs.current.delete(row.id)
              }}
              className="scroll-mt-2"
            >
              <ReviewRow row={row} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
