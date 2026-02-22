'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, User } from 'lucide-react'
import { MATCH_THRESHOLD_AUTO } from '@/lib/utils/constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Match data shape returned from the API */
export interface MatchEntry {
  child_id: string
  nama: string
  tanggal_lahir: string
  nama_ibu: string | null
  score: number
  isNikMatch: boolean
  autoFlag: boolean
}

export interface MatchDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly matches: ReadonlyArray<MatchEntry>
  readonly onUseExisting: (childId: string) => void
  readonly onCreateNew: () => void
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`
}

/**
 * Dialog shown when potential duplicate children are detected
 * during registration.
 */
export function MatchDialog({
  open,
  onOpenChange,
  matches,
  onUseExisting,
  onCreateNew,
}: MatchDialogProps) {
  const displayMatches = matches.slice(0, 3)
  const hasAutoFlag = displayMatches.some((m) => m.autoFlag)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Anak Serupa Ditemukan
          </DialogTitle>
          <DialogDescription>
            Sistem mendeteksi data anak yang mungkin sama. Harap periksa sebelum
            membuat data baru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {displayMatches.map((match) => {
            const isHighConfidence = match.score >= MATCH_THRESHOLD_AUTO
            return (
              <div
                key={match.child_id}
                className={cn(
                  'rounded-lg border-2 p-4 transition-colors',
                  isHighConfidence
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium leading-tight">{match.nama}</p>
                      <p className="text-sm text-muted-foreground">
                        Lahir: {formatDate(match.tanggal_lahir)}
                      </p>
                      {match.nama_ibu && (
                        <p className="text-sm text-muted-foreground">
                          Ibu: {match.nama_ibu}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={isHighConfidence ? 'default' : 'secondary'}
                      className={cn(
                        isHighConfidence &&
                          'bg-green-600 hover:bg-green-700 text-white'
                      )}
                    >
                      {formatPercent(match.score)}
                    </Badge>
                    {match.isNikMatch && (
                      <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        NIK cocok
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    variant={isHighConfidence ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => onUseExisting(match.child_id)}
                  >
                    Gunakan Data yang Ada
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant={hasAutoFlag ? 'outline' : 'default'}
            onClick={onCreateNew}
          >
            Buat Data Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
