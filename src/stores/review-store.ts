import { create } from 'zustand'
import { temporal } from 'zundo'
import type { ExtractedRow } from '@/types/ocr'

// ─── State shape ──────────────────────────────────────────────────────────────

interface ReviewState {
  documentId: string | null
  rows: ExtractedRow[]
  approvedRows: Set<string>
  corrections: Record<string, Partial<Record<keyof ExtractedRow, string>>>
  selectedRowId: string | null
  selectedField: string | null
  isTriageMode: boolean
  isCommitting: boolean

  // Actions
  setDocument: (id: string, rows: ExtractedRow[]) => void
  updateField: (rowId: string, field: keyof ExtractedRow, value: string) => void
  approveRow: (rowId: string) => void
  unapproveRow: (rowId: string) => void
  approveAllHighConfidence: () => void
  setSelectedRow: (rowId: string | null) => void
  setSelectedField: (field: string | null) => void
  setTriageMode: (on: boolean) => void
  setCommitting: (on: boolean) => void
  reset: () => void
}

// ─── Temporal slice (only data state, not UI state) ───────────────────────────

interface TemporalSlice {
  rows: ExtractedRow[]
  approvedRows: Set<string>
  corrections: Record<string, Partial<Record<keyof ExtractedRow, string>>>
}

// ─── Helper: check if all "data" fields of a row are high confidence ──────────

const CONFIDENCE_FIELDS: Array<keyof ExtractedRow> = [
  'namaAnakConfidence',
  'tanggalLahirConfidence',
  'jenisKelaminConfidence',
  'namaIbuConfidence',
  'bbSekarangConfidence',
  'tbConfidence',
  'statusNtConfidence',
]

function isHighConfidenceRow(row: ExtractedRow): boolean {
  return CONFIDENCE_FIELDS.every((field) => {
    const val = row[field]
    return typeof val === 'number' && val >= 0.9
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReviewStore = create<ReviewState>()(
  temporal(
    (set, get) => ({
      documentId: null,
      rows: [],
      approvedRows: new Set<string>(),
      corrections: {},
      selectedRowId: null,
      selectedField: null,
      isTriageMode: false,
      isCommitting: false,

      setDocument: (id, rows) =>
        set({
          documentId: id,
          rows,
          approvedRows: new Set<string>(),
          corrections: {},
          selectedRowId: null,
          selectedField: null,
          isTriageMode: false,
          isCommitting: false,
        }),

      updateField: (rowId, field, value) =>
        set((state) => ({
          corrections: {
            ...state.corrections,
            [rowId]: {
              ...state.corrections[rowId],
              [field]: value,
            },
          },
        })),

      approveRow: (rowId) =>
        set((state) => {
          const next = new Set(state.approvedRows)
          next.add(rowId)
          return { approvedRows: next }
        }),

      unapproveRow: (rowId) =>
        set((state) => {
          const next = new Set(state.approvedRows)
          next.delete(rowId)
          return { approvedRows: next }
        }),

      approveAllHighConfidence: () =>
        set((state) => {
          const next = new Set(state.approvedRows)
          for (const row of state.rows) {
            if (isHighConfidenceRow(row)) {
              next.add(row.id)
            }
          }
          return { approvedRows: next }
        }),

      setSelectedRow: (rowId) => set({ selectedRowId: rowId }),
      setSelectedField: (field) => set({ selectedField: field }),
      setTriageMode: (on) => set({ isTriageMode: on }),
      setCommitting: (on) => set({ isCommitting: on }),

      reset: () =>
        set({
          documentId: null,
          rows: [],
          approvedRows: new Set<string>(),
          corrections: {},
          selectedRowId: null,
          selectedField: null,
          isTriageMode: false,
          isCommitting: false,
        }),
    }),
    {
      limit: 50,
      partialize: (state): TemporalSlice => ({
        rows: state.rows,
        approvedRows: state.approvedRows,
        corrections: state.corrections,
      }),
    }
  )
)

// ─── Helper: get effective (corrected) value for a field ─────────────────────

export function getEffectiveValue(
  row: ExtractedRow,
  field: keyof ExtractedRow,
  corrections: Record<string, Partial<Record<keyof ExtractedRow, string>>>
): string {
  const corrected = corrections[row.id]?.[field]
  if (corrected !== undefined) return corrected
  const raw = row[field]
  if (raw === null || raw === undefined) return ''
  return String(raw)
}

// ─── Export temporal store hook for undo/redo ─────────────────────────────────

// temporal is a StoreApi<TemporalState<...>> — use getState() for actions
export const useTemporalReviewStore = () => useReviewStore.temporal

/** Stable action refs for undo/redo (safe to call from event handlers) */
export const temporalUndo = () => useReviewStore.temporal.getState().undo()
export const temporalRedo = () => useReviewStore.temporal.getState().redo()
