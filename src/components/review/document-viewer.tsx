'use client'

import dynamic from 'next/dynamic'
import type { ExtractedRow } from '@/types/ocr'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocumentViewerProps {
  imageUrl: string
  rows: ExtractedRow[]
  selectedRowId: string | null
  onRowClick: (rowId: string) => void
}

// ─── Dynamic import with ssr: false (OpenSeadragon requires DOM) ──────────────

const DocumentViewerInner = dynamic(
  () =>
    import('./document-viewer-inner').then((m) => ({ default: m.DocumentViewerInner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-900 text-gray-400 text-sm">
        Memuat viewer dokumen...
      </div>
    ),
  }
)

// ─── Public shell ─────────────────────────────────────────────────────────────

export function DocumentViewer(props: DocumentViewerProps) {
  return <DocumentViewerInner {...props} />
}
