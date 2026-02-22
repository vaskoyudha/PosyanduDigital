import type { OcrStatus } from './database'

export interface OCRProgress {
  documentId: string
  status: OcrStatus
  progressPercent: number
  message: string
}

export interface ExtractedRow {
  id: string
  rowIndex: number
  namaAnak: string | null
  namaAnakConfidence: number | null
  tanggalLahir: string | null
  tanggalLahirConfidence: number | null
  umur: string | null
  umurConfidence: number | null
  jenisKelamin: string | null
  jenisKelaminConfidence: number | null
  namaIbu: string | null
  namaIbuConfidence: number | null
  alamat: string | null
  alamatConfidence: number | null
  bbLalu: string | null
  bbLaluConfidence: number | null
  bbSekarang: string | null
  bbSekarangConfidence: number | null
  tb: string | null
  tbConfidence: number | null
  statusNt: string | null
  statusNtConfidence: number | null
  bbox: { x: number; y: number; width: number; height: number } | null
  isReviewed: boolean
  isApproved: boolean
  corrections: Record<string, string> | null
}

export const OCR_STATUS_MESSAGES: Record<OcrStatus, string> = {
  uploaded: 'Mengunggah...',
  preprocessing: 'Memproses gambar...',
  detecting_table: 'Mendeteksi tabel...',
  extracting_cells: 'Mengekstrak sel...',
  recognizing_text: 'Membaca tulisan tangan...',
  awaiting_review: 'Siap ditinjau',
  reviewed: 'Sedang ditinjau',
  committed: 'Data tersimpan',
  failed: 'Gagal diproses',
}

export const OCR_STATUS_PROGRESS: Record<OcrStatus, number> = {
  uploaded: 5,
  preprocessing: 20,
  detecting_table: 40,
  extracting_cells: 60,
  recognizing_text: 80,
  awaiting_review: 100,
  reviewed: 100,
  committed: 100,
  failed: 0,
}
