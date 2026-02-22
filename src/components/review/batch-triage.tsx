'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, SkipForward, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useReviewStore, getEffectiveValue } from '@/stores/review-store'
import { ConfidenceBadge } from './confidence-badge'
import type { ExtractedRow } from '@/types/ocr'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LowConfidenceCell {
  rowId: string
  rowIndex: number
  field: keyof ExtractedRow
  confidenceField: keyof ExtractedRow
  label: string
  confidence: number | null
}

// ─── Field config ─────────────────────────────────────────────────────────────

const TRIAGE_FIELDS: Array<{ key: keyof ExtractedRow; confKey: keyof ExtractedRow; label: string }> = [
  { key: 'namaAnak', confKey: 'namaAnakConfidence', label: 'Nama Anak' },
  { key: 'tanggalLahir', confKey: 'tanggalLahirConfidence', label: 'Tanggal Lahir' },
  { key: 'jenisKelamin', confKey: 'jenisKelaminConfidence', label: 'Jenis Kelamin' },
  { key: 'namaIbu', confKey: 'namaIbuConfidence', label: 'Nama Ibu' },
  { key: 'bbSekarang', confKey: 'bbSekarangConfidence', label: 'BB Sekarang' },
  { key: 'tb', confKey: 'tbConfidence', label: 'TB/PB' },
  { key: 'statusNt', confKey: 'statusNtConfidence', label: 'Status N/T' },
]

const LOW_CONFIDENCE_THRESHOLD = 0.65

// ─── Component ────────────────────────────────────────────────────────────────

export function BatchTriage() {
  const { rows, corrections, isTriageMode, setTriageMode, updateField, setSelectedRow } =
    useReviewStore()

  // Build list of low-confidence cells
  const lowConfidenceCells = React.useMemo<LowConfidenceCell[]>(() => {
    const cells: LowConfidenceCell[] = []
    for (const row of rows) {
      for (const f of TRIAGE_FIELDS) {
        const conf = row[f.confKey] as number | null
        if (conf === null || conf < LOW_CONFIDENCE_THRESHOLD) {
          cells.push({
            rowId: row.id,
            rowIndex: row.rowIndex,
            field: f.key,
            confidenceField: f.confKey,
            label: f.label,
            confidence: conf,
          })
        }
      }
    }
    return cells
  }, [rows])

  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [localValue, setLocalValue] = React.useState('')

  const total = lowConfidenceCells.length
  const current = lowConfidenceCells[currentIndex]
  const currentRow = rows.find((r) => r.id === current?.rowId)

  // Sync local value when current cell changes
  React.useEffect(() => {
    if (!current || !currentRow) return
    setLocalValue(getEffectiveValue(currentRow, current.field, corrections))
  }, [currentIndex, current, currentRow, corrections])

  // Highlight the row in the viewer
  React.useEffect(() => {
    if (current) setSelectedRow(current.rowId)
  }, [current, setSelectedRow])

  const handleSaveAndNext = () => {
    if (!current) return
    updateField(current.rowId, current.field, localValue)
    advanceToNext()
  }

  const advanceToNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      // Done!
      setTriageMode(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  if (!isTriageMode) return null

  return (
    <Dialog open={isTriageMode} onOpenChange={(open) => !open && setTriageMode(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Mode Triase</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setTriageMode(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {total === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            <p className="font-medium">Tidak ada sel dengan keyakinan rendah! 🎉</p>
            <p className="mt-1 text-xs">Semua sel memenuhi ambang keyakinan.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setTriageMode(false)}
            >
              Tutup
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-700">{currentIndex + 1}</span>
                {' '}dari{' '}
                <span className="font-semibold text-gray-700">{total}</span>
                {' '}sel perlu ditinjau
              </span>
              <div className="h-1.5 w-32 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Current cell context */}
            {current && currentRow && (
              <div className="rounded-lg border bg-gray-50 p-3 space-y-3">
                {/* Row context */}
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Baris {current.rowIndex + 1}</span>
                  {currentRow.namaAnak && (
                    <> · {currentRow.namaAnak}</>
                  )}
                </div>

                {/* Field being corrected */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      {current.label}
                    </label>
                    <ConfidenceBadge confidence={current.confidence} />
                  </div>

                  <input
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    autoFocus
                    className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nilai yang benar..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveAndNext()
                      if (e.key === 'Escape') advanceToNext()
                    }}
                  />
                </div>

                {/* All other fields for context */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t">
                  {TRIAGE_FIELDS.filter((f) => f.key !== current.field).map((f) => {
                    const val = getEffectiveValue(currentRow, f.key, corrections)
                    if (!val) return null
                    return (
                      <div key={f.key} className="text-[11px]">
                        <span className="text-gray-400">{f.label}: </span>
                        <span className="text-gray-700 font-medium">{val}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1"
                onClick={advanceToNext}
              >
                <SkipForward className="h-3.5 w-3.5" />
                Lewati
              </Button>

              <Button
                size="sm"
                className="flex-1 text-xs gap-1"
                onClick={handleSaveAndNext}
              >
                <Check className="h-3.5 w-3.5" />
                Koreksi & Lanjut
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (currentIndex < total - 1) setCurrentIndex((i) => i + 1)
                  else setTriageMode(false)
                }}
                disabled={currentIndex >= total - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
