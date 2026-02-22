export const APP_NAME = 'PosyanduDigital'
export const APP_VERSION = '1.0.0'

// Confidence thresholds for OCR
export const CONFIDENCE_HIGH = 0.90   // Green: auto-accept
export const CONFIDENCE_MEDIUM = 0.65 // Yellow: review recommended
// Below CONFIDENCE_MEDIUM = Red: must review

// WHO Z-score thresholds
export const ZSCORE_SEVERE_LOW = -3
export const ZSCORE_MODERATE_LOW = -2
export const ZSCORE_MODERATE_HIGH = 2
export const ZSCORE_SEVERE_HIGH = 3

// N/T thresholds — KBM (Kenaikan Berat Badan Minimum) by age group in grams/month
export const KBM_BY_AGE: Record<string, number> = {
  '0-3': 700,   // 0-3 months: 700g/month
  '4-6': 600,   // 4-6 months: 600g/month
  '7-9': 400,   // 7-9 months: 400g/month
  '10-12': 300, // 10-12 months: 300g/month
  '13-24': 200, // 13-24 months: 200g/month
  '25-60': 150, // 25-60 months: 150g/month
}

// SPM (Standar Pelayanan Minimal) targets
export const SPM_DS_TARGET = 0.80   // D/S ≥ 80%
export const SPM_ND_TARGET = 0.80   // N/D ≥ 80%
export const SPM_VITA_TARGET = 0.85 // Vitamin A ≥ 85%

// Traffic light thresholds for D/S ratio
export const TRAFFIC_DS_GREEN = 0.80   // ≥ 80% = hijau
export const TRAFFIC_DS_YELLOW = 0.60  // 60-79% = kuning
// < 60% = merah

// Max file size for OCR upload (10MB)
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
]

// Undo history steps in OCR review store
export const UNDO_HISTORY_LIMIT = 50

// Child matching thresholds
export const MATCH_THRESHOLD_AUTO = 0.95     // ≥ 0.95: auto-flag as duplicate
export const MATCH_THRESHOLD_REVIEW = 0.80   // 0.80-0.95: human review required
// < 0.80: treat as new record

// Role constants
export const ROLES = {
  KADER: 'kader',
  BIDAN: 'bidan',
  TPG: 'tpg',
  KEPALA: 'kepala_puskesmas',
  DINAS: 'dinas',
  ADMIN: 'admin',
} as const

// Role display names (Indonesian)
export const ROLE_LABELS: Record<string, string> = {
  kader: 'Kader Posyandu',
  bidan: 'Bidan',
  tpg: 'Tenaga Pelaksana Gizi',
  kepala_puskesmas: 'Kepala Puskesmas',
  dinas: 'Dinas Kesehatan',
  admin: 'Administrator',
}

// Supabase Storage bucket name
export const STORAGE_BUCKET = 'ocr-documents'
