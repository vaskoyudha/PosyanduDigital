'use client'

import * as React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { ExtractedRow } from '@/types/ocr'
import { useReviewStore, getEffectiveValue } from '@/stores/review-store'
import { ConfidenceBadge } from './confidence-badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewRowProps {
  row: ExtractedRow
}

// ─── Field config (label + confidence key) ────────────────────────────────────

type RowField = {
  key: keyof ExtractedRow
  confidenceKey: keyof ExtractedRow
  label: string
  type?: 'text' | 'select'
  options?: string[]
}

const ROW_FIELDS: RowField[] = [
  { key: 'namaAnak', confidenceKey: 'namaAnakConfidence', label: 'Nama Anak' },
  { key: 'tanggalLahir', confidenceKey: 'tanggalLahirConfidence', label: 'Tanggal Lahir' },
  {
    key: 'jenisKelamin',
    confidenceKey: 'jenisKelaminConfidence',
    label: 'Jenis Kelamin',
    type: 'select',
    options: ['L', 'P'],
  },
  { key: 'namaIbu', confidenceKey: 'namaIbuConfidence', label: 'Nama Ibu' },
  { key: 'bbSekarang', confidenceKey: 'bbSekarangConfidence', label: 'BB Sekarang (kg)' },
  { key: 'tb', confidenceKey: 'tbConfidence', label: 'TB/PB (cm)' },
  { key: 'statusNt', confidenceKey: 'statusNtConfidence', label: 'Status N/T' },
]

// ─── Row border color ─────────────────────────────────────────────────────────

function getRowBorderClass(row: ExtractedRow, isApproved: boolean): string {
  if (isApproved) return 'border-l-emerald-500 bg-emerald-50/30'

  const confidences = [
    row.namaAnakConfidence,
    row.tanggalLahirConfidence,
    row.jenisKelaminConfidence,
    row.bbSekarangConfidence,
    row.tbConfidence,
  ].filter((v): v is number => v !== null)

  const hasLow = confidences.some((v) => v < 0.65)
  if (hasLow) return 'border-l-red-400 bg-red-50/20'

  const hasAnyBelowMedium = confidences.some((v) => v < 0.9)
  if (hasAnyBelowMedium) return 'border-l-amber-400 bg-amber-50/20'

  return 'border-l-gray-200'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewRow({ row }: ReviewRowProps) {
  const { approvedRows, corrections, updateField, approveRow, unapproveRow, setSelectedRow } =
    useReviewStore()

  const isApproved = approvedRows.has(row.id)
  const rowCorrections = corrections[row.id] ?? {}

  const borderClass = getRowBorderClass(row, isApproved)

  const handleApproveToggle = () => {
    if (isApproved) {
      unapproveRow(row.id)
    } else {
      approveRow(row.id)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 p-3 transition-colors cursor-pointer',
        borderClass,
        isApproved ? 'opacity-90' : 'hover:bg-gray-50/50'
      )}
      onClick={() => setSelectedRow(row.id)}
    >
      {/* Row header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Baris {row.rowIndex + 1}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleApproveToggle()
          }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            'border transition-all duration-150 focus-visible:outline-none',
            isApproved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          {isApproved ? (
            <>
              <XCircle className="h-3.5 w-3.5" />
              Batalkan
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Setuju ✓
            </>
          )}
        </button>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ROW_FIELDS.map((field) => {
          const effectiveValue = getEffectiveValue(row, field.key, corrections)
          const originalValue = row[field.key]
          const originalStr = originalValue !== null && originalValue !== undefined
            ? String(originalValue)
            : ''
          const isCorrected =
            rowCorrections[field.key] !== undefined && rowCorrections[field.key] !== originalStr
          const confidence = row[field.confidenceKey] as number | null

          return (
            <div key={field.key} className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-1">
                <label className="text-[11px] font-medium text-gray-500 leading-none">
                  {field.label}
                </label>
                <ConfidenceBadge confidence={confidence} />
              </div>

              {field.type === 'select' ? (
                <select
                  value={effectiveValue}
                  onChange={(e) => updateField(row.id, field.key, e.target.value)}
                  className={cn(
                    'h-7 w-full rounded border bg-white px-2 text-xs font-medium',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500',
                    isCorrected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                  )}
                >
                  <option value="">—</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  defaultValue={effectiveValue}
                  onBlur={(e) => {
                    const newVal = e.target.value.trim()
                    if (newVal !== effectiveValue) {
                      updateField(row.id, field.key, newVal)
                    }
                  }}
                  className={cn(
                    'h-7 w-full rounded border bg-white px-2 text-xs font-medium',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500',
                    isCorrected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                  )}
                />
              )}

              {/* Show original value with strikethrough if corrected */}
              {isCorrected && originalStr && (
                <span className="text-[10px] text-gray-400 line-through leading-none mt-0.5">
                  {originalStr}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
