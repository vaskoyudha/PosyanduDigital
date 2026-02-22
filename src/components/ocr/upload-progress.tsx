'use client'

import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { useOcrProgress } from '@/lib/hooks/use-ocr-progress'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UploadProgressProps {
  documentId: string
  onRetry?: () => void
}

/**
 * Real-time progress display for an OCR document.
 * Subscribes via Supabase Realtime + polling fallback.
 */
export function UploadProgress({ documentId, onRetry }: UploadProgressProps) {
  const { status, progress, message, errorMessage, isComplete } = useOcrProgress(documentId)

  const isFailed = status === 'failed'
  const isReady = status === 'awaiting_review'
  const isCommitted = status === 'committed'
  const isProcessing = !isComplete && status !== null

  return (
    <div className="space-y-4">
      {/* Status icon + message */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        {isFailed ? (
          <XCircle className="h-6 w-6 text-destructive flex-shrink-0" />
        ) : isReady || isCommitted ? (
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-primary flex-shrink-0" />
        )}

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium',
              isFailed && 'text-destructive',
              (isReady || isCommitted) && 'text-green-700'
            )}
          >
            {message}
          </p>
          {isProcessing && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {progress}% selesai
            </p>
          )}
          {isFailed && errorMessage && (
            <p className="text-xs text-destructive/80 mt-0.5">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Progress
        value={progress}
        className={cn(
          'h-2.5',
          isFailed && '[&>div]:bg-destructive',
          (isReady || isCommitted) && '[&>div]:bg-green-600'
        )}
      />

      {/* Action buttons */}
      {isReady && (
        <Button asChild className="w-full" variant="default">
          <Link href={`/review/${documentId}`}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Tinjau Sekarang
          </Link>
        </Button>
      )}

      {isFailed && onRetry && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Coba Lagi
        </Button>
      )}
    </div>
  )
}
