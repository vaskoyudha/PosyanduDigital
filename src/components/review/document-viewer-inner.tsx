'use client'

import * as React from 'react'
import type OpenSeadragon from 'openseadragon'
import type { ExtractedRow } from '@/types/ocr'
import { useReviewStore } from '@/stores/review-store'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocumentViewerInnerProps {
  imageUrl: string
  rows: ExtractedRow[]
  selectedRowId: string | null
  onRowClick: (rowId: string) => void
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

function getRowColor(
  row: ExtractedRow,
  isApproved: boolean,
  isSelected: boolean
): { border: string; bg: string } {
  if (isApproved) return { border: '#22c55e', bg: 'rgba(34,197,94,0.12)' }

  const confidenceValues = [
    row.namaAnakConfidence,
    row.tanggalLahirConfidence,
    row.jenisKelaminConfidence,
    row.bbSekarangConfidence,
    row.tbConfidence,
  ].filter((v): v is number => v !== null)

  const avg =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : 0

  if (avg >= 0.65) return { border: '#f59e0b', bg: 'rgba(245,158,11,0.10)' }
  return { border: '#ef4444', bg: 'rgba(239,68,68,0.10)' }
}

// ─── Inner Component (uses OSD) ───────────────────────────────────────────────

export function DocumentViewerInner({
  imageUrl,
  rows,
  selectedRowId,
  onRowClick,
}: DocumentViewerInnerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewerRef = React.useRef<OpenSeadragon.Viewer | null>(null)
  const overlayContainerRef = React.useRef<HTMLDivElement>(null)
  const approvedRows = useReviewStore((s) => s.approvedRows)

  // ── Natural image dimensions for coordinate normalisation ──
  const [imgDims, setImgDims] = React.useState<{ w: number; h: number } | null>(null)

  // Preload the image to get natural dimensions
  React.useEffect(() => {
    const img = new Image()
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = imageUrl
  }, [imageUrl])

  // ── Initialise OpenSeadragon ──────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current) return

    // Dynamic import inside effect to avoid SSR issues
    let OSD: typeof OpenSeadragon
    import('openseadragon')
      .then((mod) => {
        OSD = mod.default as typeof OpenSeadragon

        const viewer = OSD({
          element: containerRef.current!,
          tileSources: {
            type: 'image',
            url: imageUrl,
          },
          showNavigationControl: true,
          navigationControlAnchor: OSD.ControlAnchor.TOP_LEFT,
          showZoomControl: true,
          showHomeControl: true,
          showFullPageControl: false,
          showRotationControl: false,
          gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
          minZoomImageRatio: 0.5,
          maxZoomPixelRatio: 4,
          animationTime: 0.3,
          visibilityRatio: 0.5,
          defaultZoomLevel: 0,
          immediateRender: true,
          preserveImageSizeOnResize: true,
        })

        viewerRef.current = viewer
      })
      .catch((err) => console.error('OpenSeadragon load error:', err))

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

  // ── Render bounding-box overlays ──────────────────────────

  // Overlays are CSS-positioned absolutely over the OSD canvas wrapper.
  // We use a transparent div that sits on top of the viewer and updates
  // on zoom/pan by polling the viewport (simple & reliable).

  const [viewportState, setViewportState] = React.useState(0) // counter to trigger re-render

  React.useEffect(() => {
    if (!viewerRef.current) return

    const handler = () => setViewportState((n) => n + 1)
    const viewer = viewerRef.current

    viewer.addHandler('update-viewport', handler)
    viewer.addHandler('open', handler)
    viewer.addHandler('zoom', handler)
    viewer.addHandler('pan', handler)
    viewer.addHandler('resize', handler)
    viewer.addHandler('canvas-scroll', handler)

    return () => {
      viewer.removeHandler('update-viewport', handler)
      viewer.removeHandler('open', handler)
      viewer.removeHandler('zoom', handler)
      viewer.removeHandler('pan', handler)
      viewer.removeHandler('resize', handler)
      viewer.removeHandler('canvas-scroll', handler)
    }
  }, [viewerRef.current]) // intentionally trigger when viewer initializes

  // Convert pixel bbox → screen pixel rect using OSD viewport API
  function bboxToScreenRect(bbox: { x: number; y: number; width: number; height: number }) {
    const viewer = viewerRef.current
    if (!viewer || !imgDims) return null

    try {
      const viewport = viewer.viewport
      if (!viewport) return null

      // imageToViewportCoordinates converts image px → normalized viewport coords
      const topLeftVP = viewport.imageToViewportCoordinates(bbox.x, bbox.y)
      const bottomRightVP = viewport.imageToViewportCoordinates(
        bbox.x + bbox.width,
        bbox.y + bbox.height
      )

      // viewportToViewerElementCoordinates converts normalized VP → screen px
      const topLeftScreen = viewport.viewportToViewerElementCoordinates(topLeftVP)
      const bottomRightScreen = viewport.viewportToViewerElementCoordinates(bottomRightVP)

      return {
        left: topLeftScreen.x,
        top: topLeftScreen.y,
        width: bottomRightScreen.x - topLeftScreen.x,
        height: bottomRightScreen.y - topLeftScreen.y,
      }
    } catch {
      return null
    }
  }

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      {/* OSD container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Overlay layer — pointer-events-none except for click targets */}
      {imgDims && viewerRef.current && (
        <div
          ref={overlayContainerRef}
          className="absolute inset-0 pointer-events-none"
          key={viewportState} // force re-render on viewport change
        >
          {rows.map((row) => {
            if (!row.bbox) return null
            const rect = bboxToScreenRect(row.bbox)
            if (!rect) return null

            const isApproved = approvedRows.has(row.id)
            const isSelected = row.id === selectedRowId
            const colors = getRowColor(row, isApproved, isSelected)

            return (
              <div
                key={row.id}
                className="absolute pointer-events-auto cursor-pointer transition-all duration-150"
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  border: `${isSelected ? 3 : 2}px solid ${colors.border}`,
                  background: isSelected ? colors.bg.replace('0.1', '0.2') : colors.bg,
                  boxShadow: isSelected ? `0 0 0 2px ${colors.border}40` : 'none',
                  borderRadius: 3,
                }}
                onClick={() => onRowClick(row.id)}
                title={`Baris ${row.rowIndex + 1}: ${row.namaAnak ?? '—'}`}
              >
                {/* Row number label */}
                <span
                  className="absolute -top-5 left-0 text-[10px] font-bold px-1 py-0.5 rounded-sm leading-none"
                  style={{
                    background: colors.border,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.rowIndex + 1}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Loading state */}
      {!imgDims && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          Memuat gambar...
        </div>
      )}
    </div>
  )
}
