/**
 * Excel Export — e-PPGBM format
 *
 * Generates XLSX workbook with two sheets:
 * 1. "Data Dasar" — child registration data
 * 2. "Pemantauan Pertumbuhan" — monthly measurements
 */

import * as XLSX from 'xlsx'
import {
  type EppgbmDataDasar,
  type EppgbmPemantauan,
  EPPGBM_DATA_DASAR_HEADERS,
  EPPGBM_PEMANTAUAN_HEADERS,
  dataDasarToRow,
  pemantauanToRow,
} from './eppgbm-template'

/**
 * Generate e-PPGBM Excel workbook as Buffer.
 */
export function generateEppgbmExcel(
  dataDasar: EppgbmDataDasar[],
  pemantauan: EppgbmPemantauan[],
  posyanduNama: string,
  bulan: string // YYYY-MM
): Buffer {
  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Data Dasar ---
  const ddRows: (string | number | null)[][] = [
    EPPGBM_DATA_DASAR_HEADERS,
    ...dataDasar.map(dataDasarToRow),
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(ddRows)

  // Column widths
  ws1['!cols'] = [
    { wch: 20 },  // No. KK
    { wch: 20 },  // NIK Anak
    { wch: 30 },  // Nama Anak
    { wch: 15 },  // Tanggal Lahir
    { wch: 8 },   // Jenis Kelamin
    { wch: 8 },   // Anak Ke
    { wch: 12 },  // Berat Lahir
    { wch: 12 },  // Panjang Lahir
    { wch: 20 },  // NIK Ibu
    { wch: 20 },  // NIK Ayah
    { wch: 30 },  // Nama Ibu
    { wch: 40 },  // Alamat
    { wch: 15 },  // ID Posyandu
    { wch: 15 },  // ID Puskesmas
  ]

  const sheetName1 = `Data Dasar - ${posyanduNama}`.slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws1, sheetName1)

  // --- Sheet 2: Pemantauan Pertumbuhan ---
  const pmRows: (string | number | null)[][] = [
    EPPGBM_PEMANTAUAN_HEADERS,
    ...pemantauan.map(pemantauanToRow),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(pmRows)

  // Column widths
  ws2['!cols'] = [
    { wch: 20 },  // NIK Anak
    { wch: 30 },  // Nama Anak
    { wch: 12 },  // Bulan
    { wch: 15 },  // Tanggal Penimbangan
    { wch: 12 },  // Berat Badan
    { wch: 12 },  // Tinggi Badan
    { wch: 12 },  // Lingkar Kepala
    { wch: 12 },  // LILA
    { wch: 15 },  // Status BB/U
    { wch: 15 },  // Status TB/U
    { wch: 15 },  // Status BB/TB
  ]

  const sheetName2 = `Pemantauan - ${bulan}`.slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws2, sheetName2)

  // Write to buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return buf
}
