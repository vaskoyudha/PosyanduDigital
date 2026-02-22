'use client'

import { useState, useCallback, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, Eye, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EppgbmPreview } from '@/components/export/eppgbm-preview'
import { getCurrentMonth, getLastNMonths, formatMonthIndonesian } from '@/lib/utils/date'

interface PosyanduItem {
  id: string
  nama: string
  puskesmas_id: string | null
}

interface PuskesmasItem {
  id: string
  nama: string
}

interface ToastState {
  type: 'success' | 'error'
  message: string
}

export interface ExportPageClientProps {
  posyanduList: PosyanduItem[]
  puskesmasList: PuskesmasItem[]
  userRole: string
  userPuskesmasId: string | null
}

type ExportFormat = 'excel' | 'pdf'

export function ExportPageClient({
  posyanduList,
  puskesmasList,
  userRole,
  userPuskesmasId,
}: Readonly<ExportPageClientProps>) {
  const months = getLastNMonths(12)
  const [selectedPosyanduId, setSelectedPosyanduId] = useState<string>(
    posyanduList.length === 1 ? posyanduList[0].id : ''
  )
  const [selectedPuskesmasId, setSelectedPuskesmasId] = useState<string>(
    userPuskesmasId ?? (puskesmasList.length === 1 ? puskesmasList[0].id : '')
  )
  const [selectedBulan, setSelectedBulan] = useState<string>(getCurrentMonth())
  const [format, setFormat] = useState<ExportFormat>('excel')
  const [showPreview, setShowPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Filter posyandu by selected puskesmas if user has multi-puskesmas access
  const filteredPosyandu = selectedPuskesmasId
    ? posyanduList.filter(p => p.puskesmas_id === selectedPuskesmasId)
    : posyanduList

  const handleDownload = useCallback(() => {
    if (format === 'excel') {
      if (!selectedPosyanduId) {
        setToast({ type: 'error', message: 'Pilih posyandu terlebih dahulu' })
        return
      }
      setDownloading(true)
      const url = `/api/export/eppgbm?posyandu_id=${selectedPosyanduId}&bulan=${selectedBulan}`
      // Use a hidden link to trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => {
        setDownloading(false)
        setToast({ type: 'success', message: 'File Excel berhasil diunduh' })
      }, 1500)
    } else {
      // PDF
      const puskId = selectedPuskesmasId || userPuskesmasId
      if (!puskId) {
        setToast({ type: 'error', message: 'Pilih puskesmas terlebih dahulu' })
        return
      }
      setDownloading(true)
      const url = `/api/export/report?puskesmas_id=${puskId}&bulan=${selectedBulan}`
      const link = document.createElement('a')
      link.href = url
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => {
        setDownloading(false)
        setToast({ type: 'success', message: 'File PDF berhasil diunduh' })
      }, 1500)
    }
  }, [format, selectedPosyanduId, selectedPuskesmasId, selectedBulan, userPuskesmasId])

  const handlePreview = useCallback(() => {
    if (!selectedPosyanduId) {
      setToast({ type: 'error', message: 'Pilih posyandu untuk melihat pratinjau' })
      return
    }
    setShowPreview(true)
  }, [selectedPosyanduId])

  const canShowPuskesmasSelector = puskesmasList.length > 1
  const canShowPdfOption = ['tpg', 'kepala_puskesmas', 'dinas', 'admin'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ekspor Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unduh data e-PPGBM dalam format Excel atau laporan bulanan dalam format PDF.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Pengaturan Ekspor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format selector */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Format</label>
              <Select value={format} onValueChange={(val) => setFormat(val as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      Excel (e-PPGBM)
                    </div>
                  </SelectItem>
                  {canShowPdfOption && (
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500" />
                        PDF (Laporan Bulanan)
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Puskesmas selector (if dinas/admin with multiple puskesmas) */}
            {canShowPuskesmasSelector && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Puskesmas</label>
                <Select
                  value={selectedPuskesmasId}
                  onValueChange={(val) => {
                    setSelectedPuskesmasId(val)
                    setSelectedPosyanduId('')
                    setShowPreview(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih puskesmas..." />
                  </SelectTrigger>
                  <SelectContent>
                    {puskesmasList.map(pk => (
                      <SelectItem key={pk.id} value={pk.id}>
                        {pk.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Posyandu selector */}
            {format === 'excel' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Posyandu</label>
                <Select
                  value={selectedPosyanduId}
                  onValueChange={(val) => {
                    setSelectedPosyanduId(val)
                    setShowPreview(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih posyandu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPosyandu.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Month selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Bulan</label>
              <Select value={selectedBulan} onValueChange={(val) => {
                setSelectedBulan(val)
                setShowPreview(false)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>
                      {formatMonthIndonesian(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {format === 'excel' && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!selectedPosyanduId}
              >
                <Eye className="h-4 w-4 mr-2" />
                Pratinjau
              </Button>
            )}
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {downloading ? 'Mengunduh...' : 'Unduh'}
            </Button>
            {format === 'excel' && (
              <Badge variant="outline" className="text-xs">
                2 sheet: Data Dasar + Pemantauan
              </Badge>
            )}
            {format === 'pdf' && (
              <Badge variant="outline" className="text-xs">
                SKDN + Status Gizi + Daftar BGM/2T
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {showPreview && selectedPosyanduId && (
        <EppgbmPreview
          posyanduId={selectedPosyanduId}
          bulan={selectedBulan}
        />
      )}
    </div>
  )
}
