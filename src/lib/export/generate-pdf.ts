/**
 * PDF Report Generator — Laporan Bulanan Gizi
 *
 * A4 portrait (210×297mm) with sections:
 * 1. Header: title, posyandu, puskesmas, period
 * 2. SKDN table
 * 3. Status Gizi table (prevalence)
 * 4. Daftar BGM
 * 5. Daftar 2T
 * 6. Footer: print timestamp
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from 'jspdf'
import type { SKDNData } from '@/lib/analytics/skdn'
import type { PrevalenceData } from '@/lib/analytics/prevalence'
import type { AlertChild } from '@/lib/analytics/alerts'
import { formatMonthIndonesian } from '@/lib/utils/date'

export interface PdfReportData {
  posyanduNama: string
  puskesmasNama: string
  bulan: string // YYYY-MM
  skdn: SKDNData | null
  prevalence: PrevalenceData | null
  bgmList: AlertChild[]
  twoTList: AlertChild[]
  totalChildren: number
}

const PAGE_WIDTH = 210
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

function drawTableRow(
  doc: jsPDF,
  y: number,
  cols: string[],
  widths: number[],
  opts?: { bold?: boolean; fill?: boolean }
) {
  let x = MARGIN_LEFT
  const rowHeight = 8

  if (opts?.fill) {
    doc.setFillColor(240, 240, 240)
    doc.rect(x, y - 1, CONTENT_WIDTH, rowHeight, 'F')
  }

  if (opts?.bold) {
    doc.setFont('helvetica', 'bold')
  } else {
    doc.setFont('helvetica', 'normal')
  }

  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x + 2, y + 4)
    x += widths[i]
  }

  return y + rowHeight
}

function drawHorizontalLine(doc: jsPDF, y: number) {
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y)
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 270) {
    doc.addPage()
    return 20
  }
  return y
}

/**
 * Generate monthly nutrition report PDF.
 */
export function generateMonthlyReport(data: PdfReportData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let y = 20

  // ============ HEADER ============
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('LAPORAN BULANAN GIZI', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Posyandu: ${data.posyanduNama}`, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 6
  doc.text(`Puskesmas: ${data.puskesmasNama}`, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 6
  doc.text(`Periode: ${formatMonthIndonesian(data.bulan)}`, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 4

  drawHorizontalLine(doc, y)
  y += 6

  doc.setFontSize(9)
  doc.text(`Total anak terdaftar: ${data.totalChildren}`, MARGIN_LEFT, y)
  y += 8

  // ============ SECTION 1: SKDN ============
  y = checkPageBreak(doc, y, 50)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Data SKDN', MARGIN_LEFT, y)
  y += 6

  doc.setFontSize(9)
  const skdnWidths = [45, 25, 25, 25, 25, 25]
  y = drawTableRow(doc, y, ['Indikator', 'S', 'K', 'D', 'N', 'BGM'], skdnWidths, { bold: true, fill: true })
  drawHorizontalLine(doc, y)

  if (data.skdn) {
    const s = data.skdn
    y = drawTableRow(doc, y, ['Jumlah', String(s.S), String(s.K), String(s.D), String(s.N), String(s.BGM)], skdnWidths)
    drawHorizontalLine(doc, y)
    y = drawTableRow(doc, y, [
      'Rasio',
      '-',
      '-',
      `D/S: ${s.ds_pct}%`,
      `N/D: ${s.nd_pct}%`,
      `2T: ${s.twoT}`,
    ], skdnWidths)
    drawHorizontalLine(doc, y)
  } else {
    y = drawTableRow(doc, y, ['Tidak ada data SKDN', '-', '-', '-', '-', '-'], skdnWidths)
    drawHorizontalLine(doc, y)
  }
  y += 8

  // ============ SECTION 2: STATUS GIZI ============
  y = checkPageBreak(doc, y, 50)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Status Gizi (Prevalensi)', MARGIN_LEFT, y)
  y += 6

  doc.setFontSize(9)
  const statusWidths = [50, 30, 30, 30, 30]
  y = drawTableRow(doc, y, ['Status', 'Stunting', 'Wasting', 'Underweight', 'Overweight'], statusWidths, { bold: true, fill: true })
  drawHorizontalLine(doc, y)

  if (data.prevalence) {
    const p = data.prevalence
    y = drawTableRow(doc, y, [
      'Jumlah',
      String(p.stunting_count),
      String(p.wasting_count),
      String(p.underweight_count),
      String(p.overweight_count),
    ], statusWidths)
    drawHorizontalLine(doc, y)
    y = drawTableRow(doc, y, [
      'Persentase',
      `${p.stunting_pct}%`,
      `${p.wasting_pct}%`,
      `${p.underweight_pct}%`,
      `${p.overweight_pct}%`,
    ], statusWidths)
    drawHorizontalLine(doc, y)
  } else {
    y = drawTableRow(doc, y, ['Tidak ada data', '-', '-', '-', '-'], statusWidths)
    drawHorizontalLine(doc, y)
  }
  y += 8

  // ============ SECTION 3: DAFTAR BGM ============
  y = checkPageBreak(doc, y, 30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`3. Daftar Anak BGM (${data.bgmList.length})`, MARGIN_LEFT, y)
  y += 6

  doc.setFontSize(9)
  const bgmWidths = [15, 50, 30, 35, 40]
  y = drawTableRow(doc, y, ['No', 'Nama', 'Usia (bln)', 'BB Terakhir (kg)', 'Posyandu'], bgmWidths, { bold: true, fill: true })
  drawHorizontalLine(doc, y)

  if (data.bgmList.length === 0) {
    y = drawTableRow(doc, y, ['—', 'Tidak ada anak BGM', '', '', ''], bgmWidths)
    drawHorizontalLine(doc, y)
  } else {
    for (let i = 0; i < data.bgmList.length; i++) {
      y = checkPageBreak(doc, y, 10)
      const b = data.bgmList[i]
      y = drawTableRow(doc, y, [
        String(i + 1),
        b.nama,
        String(b.usiaBulan),
        b.bbTerakhir != null ? String(b.bbTerakhir) : '-',
        b.posyanduNama,
      ], bgmWidths)
      drawHorizontalLine(doc, y)
    }
  }
  y += 8

  // ============ SECTION 4: DAFTAR 2T ============
  y = checkPageBreak(doc, y, 30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`4. Daftar Anak 2T (${data.twoTList.length})`, MARGIN_LEFT, y)
  y += 6

  doc.setFontSize(9)
  const twoTWidths = [15, 50, 30, 35, 40]
  y = drawTableRow(doc, y, ['No', 'Nama', 'Usia (bln)', 'BB Terakhir (kg)', 'Posyandu'], twoTWidths, { bold: true, fill: true })
  drawHorizontalLine(doc, y)

  if (data.twoTList.length === 0) {
    y = drawTableRow(doc, y, ['—', 'Tidak ada anak 2T', '', '', ''], twoTWidths)
    drawHorizontalLine(doc, y)
  } else {
    for (let i = 0; i < data.twoTList.length; i++) {
      y = checkPageBreak(doc, y, 10)
      const t = data.twoTList[i]
      y = drawTableRow(doc, y, [
        String(i + 1),
        t.nama,
        String(t.usiaBulan),
        t.bbTerakhir != null ? String(t.bbTerakhir) : '-',
        t.posyanduNama,
      ], twoTWidths)
      drawHorizontalLine(doc, y)
    }
  }
  y += 10

  // ============ FOOTER ============
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const timestamp = `${dd}/${mm}/${yyyy} ${hh}:${min}`

  // Footer on last page
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(130, 130, 130)
  doc.text(`Dicetak: ${timestamp}`, MARGIN_LEFT, 285)
  doc.text('PosyanduDigital — Laporan Otomatis', PAGE_WIDTH - MARGIN_RIGHT, 285, { align: 'right' })

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Return as Buffer
  const arrayBuf = doc.output('arraybuffer')
  return Buffer.from(arrayBuf)
}
