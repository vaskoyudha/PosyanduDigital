'use client'

import * as React from 'react'
import {
  CheckCheck,
  FlaskConical,
  Undo2,
  Redo2,
  Save,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReviewStore, useTemporalReviewStore } from '@/stores/review-store'
import { cn } from '@/lib/utils'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReviewToolbarProps {
  onCommit: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewToolbar({ onCommit }: ReviewToolbarProps) {
  const {
    rows,
    approvedRows,
    approveAllHighConfidence,
    setTriageMode,
    isCommitting,
  } = useReviewStore()

  const temporalStore = useTemporalReviewStore()

  const approvedCount = approvedRows.size
  const totalCount = rows.length

  // ── Undo/redo availability ─────────────────────────────────────────────────
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)

  React.useEffect(() => {
    const unsub = temporalStore.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0)
      setCanRedo(state.futureStates.length > 0)
    })
    const cur = temporalStore.getState()
    setCanUndo(cur.pastStates.length > 0)
    setCanRedo(cur.futureStates.length > 0)
    return unsub
  }, [temporalStore])

  const handleUndo = React.useCallback(() => temporalStore.getState().undo(), [temporalStore])
  const handleRedo = React.useCallback(() => temporalStore.getState().redo(), [temporalStore])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.shiftKey && e.key === 'z'))
      ) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-white flex-wrap">
      {/* Approve all high-confidence */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        onClick={approveAllHighConfidence}
        title="Setujui semua baris dengan keyakinan ≥ 90%"
      >
        <CheckCheck className="h-3.5 w-3.5" />
        Setujui Semua Hijau
      </Button>

      {/* Triage mode */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
        onClick={() => setTriageMode(true)}
        title="Tinjau sel dengan keyakinan rendah satu per satu"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        Mode Triase
      </Button>

      {/* Undo / Redo */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Batalkan (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Ulangi (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="flex-1 text-center">
        <span className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{approvedCount}</span>
          {' '}baris disetujui dari{' '}
          <span className="font-semibold text-gray-700">{totalCount}</span>
          {' '}total
        </span>
      </div>

      {/* Commit */}
      <Button
        size="sm"
        className={cn(
          'h-8 text-xs gap-1.5',
          approvedCount === 0 && 'opacity-50'
        )}
        onClick={onCommit}
        disabled={approvedCount === 0 || isCommitting}
        title={
          approvedCount === 0
            ? 'Setujui setidaknya 1 baris sebelum menyimpan'
            : `Simpan & komit ${approvedCount} baris ke database`
        }
      >
        {isCommitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Menyimpan...
          </>
        ) : (
          <>
            <Save className="h-3.5 w-3.5" />
            Simpan & Komit
          </>
        )}
      </Button>
    </div>
  )
}
