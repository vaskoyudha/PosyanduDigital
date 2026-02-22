'use client'

import * as React from 'react'
import { Upload, Camera, X, FileImage, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/utils/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadDropzoneProps {
  posyanduId: string
  onUpload: (files: File[], bulanData: string) => Promise<void>
  maxFiles?: number
  disabled?: boolean
}

interface QueuedFile {
  id: string
  file: File
  preview: string | null
  state: 'pending' | 'compressing' | 'ready' | 'uploading' | 'done' | 'error'
  error?: string
}

// ─── Month helpers ────────────────────────────────────────────────────────────

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  // Last 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const value = `${yyyy}-${mm}`
    const label = `${MONTH_NAMES_ID[d.getMonth()]} ${yyyy}`
    options.push({ value, label })
  }
  return options
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UploadDropzone({
  posyanduId,
  onUpload,
  maxFiles = 5,
  disabled = false,
}: UploadDropzoneProps) {
  const [queue, setQueue] = React.useState<QueuedFile[]>([])
  const [bulanData, setBulanData] = React.useState('')
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)

  const monthOptions = React.useMemo(generateMonthOptions, [])

  // ── Compress & add files ──────────────────────────────────────────────────

  const addFiles = React.useCallback(async (fileList: FileList | File[]) => {
    setError(null)
    const files = Array.from(fileList)

    // Check max
    const currentCount = queue.length
    if (currentCount + files.length > maxFiles) {
      setError(`Maksimal ${maxFiles} file. Anda sudah memiliki ${currentCount} file.`)
      return
    }

    // Validate types
    for (const f of files) {
      if (!ACCEPTED_MIME_TYPES.includes(f.type)) {
        setError(`Tipe file "${f.name}" tidak didukung. Gunakan JPEG, PNG, HEIC, WebP, atau PDF.`)
        return
      }
      if (f.size > MAX_UPLOAD_SIZE_BYTES) {
        setError(`File "${f.name}" melebihi batas 10MB.`)
        return
      }
    }

    // Create queued entries
    const newEntries: QueuedFile[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      state: 'compressing' as const,
    }))

    setQueue((prev) => [...prev, ...newEntries])

    // Compress images in parallel
    for (const entry of newEntries) {
      if (entry.file.type.startsWith('image/') && entry.file.type !== 'image/heic') {
        try {
          const compressed = await imageCompression(entry.file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          })

          // Revoke old preview, create new
          setQueue((prev) =>
            prev.map((q) => {
              if (q.id !== entry.id) return q
              if (q.preview) URL.revokeObjectURL(q.preview)
              return {
                ...q,
                file: new File([compressed], entry.file.name, { type: compressed.type }),
                preview: URL.createObjectURL(compressed),
                state: 'ready' as const,
              }
            })
          )
        } catch {
          // If compression fails, keep original
          setQueue((prev) =>
            prev.map((q) => (q.id === entry.id ? { ...q, state: 'ready' as const } : q))
          )
        }
      } else {
        // Non-image or HEIC — skip compression
        setQueue((prev) =>
          prev.map((q) => (q.id === entry.id ? { ...q, state: 'ready' as const } : q))
        )
      }
    }
  }, [queue.length, maxFiles])

  // ── Remove file ───────────────────────────────────────────────────────────

  function removeFile(id: string) {
    setQueue((prev) => {
      const removed = prev.find((q) => q.id === id)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((q) => q.id !== id)
    })
  }

  // ── Drag events ───────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      void addFiles(e.dataTransfer.files)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!bulanData) {
      setError('Pilih bulan data terlebih dahulu.')
      return
    }

    const readyFiles = queue.filter((q) => q.state === 'ready')
    if (readyFiles.length === 0) {
      setError('Tidak ada file yang siap diunggah.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      await onUpload(
        readyFiles.map((q) => q.file),
        bulanData
      )
      // Clear queue on success
      queue.forEach((q) => {
        if (q.preview) URL.revokeObjectURL(q.preview)
      })
      setQueue([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah. Silakan coba lagi.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Cleanup previews on unmount ───────────────────────────────────────────

  React.useEffect(() => {
    return () => {
      queue.forEach((q) => {
        if (q.preview) URL.revokeObjectURL(q.preview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const readyCount = queue.filter((q) => q.state === 'ready').length
  const hasCompressing = queue.some((q) => q.state === 'compressing')
  const canSubmit = readyCount > 0 && !!bulanData && !isUploading && !hasCompressing && !disabled

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Month selector */}
        <div className="space-y-2">
          <Label htmlFor="bulan-data">Bulan Data *</Label>
          <Select value={bulanData} onValueChange={setBulanData} disabled={disabled}>
            <SelectTrigger id="bulan-data">
              <SelectValue placeholder="Pilih bulan data" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dropzone area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
            disabled && 'pointer-events-none opacity-50'
          )}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
        >
          <Upload className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Seret & lepas file di sini
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            JPEG, PNG, HEIC, WebP, PDF — maks {maxFiles} file, 10MB/file
          </p>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = '' // Reset so same file can be re-selected
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || queue.length >= maxFiles}
          >
            <FileImage className="h-4 w-4 mr-2" />
            Pilih File
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || queue.length >= maxFiles}
          >
            <Camera className="h-4 w-4 mr-2" />
            Kamera
          </Button>
        </div>

        {/* File queue */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <Label>File ({queue.length}/{maxFiles})</Label>
            <div className="space-y-2">
              {queue.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-lg border bg-background p-2"
                >
                  {/* Thumbnail */}
                  {q.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={q.preview}
                      alt={q.file.name}
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted flex-shrink-0">
                      <FileImage className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(q.file.size / 1024).toFixed(0)} KB
                      {q.state === 'compressing' && ' — Mengompresi...'}
                      {q.state === 'ready' && ' — Siap'}
                      {q.state === 'uploading' && ' — Mengunggah...'}
                      {q.state === 'done' && ' — Selesai'}
                      {q.state === 'error' && ` — ${q.error ?? 'Gagal'}`}
                    </p>
                  </div>

                  {/* Status / Remove */}
                  {q.state === 'compressing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(q.id)
                      }}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Hapus</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengunggah...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Unggah {readyCount > 0 ? `${readyCount} File` : 'File'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
