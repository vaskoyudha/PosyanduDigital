/**
 * Indonesian Error Messages
 *
 * Consistent user-facing error messages in Bahasa Indonesia.
 * Used across API routes, form validations, and UI error states.
 */

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Anda tidak memiliki akses ke halaman ini.',
  NOT_FOUND: 'Data tidak ditemukan.',
  NETWORK_ERROR: 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
  VALIDATION_ERROR: 'Data yang dimasukkan tidak valid.',
  SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi.',
  UPLOAD_TOO_LARGE: 'Ukuran file terlalu besar. Maksimal 10MB.',
  UPLOAD_INVALID_TYPE: 'Format file tidak didukung. Gunakan JPG, PNG, atau PDF.',
  OCR_FAILED: 'Gagal memproses gambar. Pastikan foto jelas dan tidak buram.',
  EXPORT_FAILED: 'Gagal mengunduh file. Silakan coba lagi.',
  MEASUREMENT_INVALID: 'Nilai pengukuran tidak valid. Periksa kembali berat dan tinggi badan.',
} as const

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES

/**
 * Get an Indonesian error message by key.
 */
export function getErrorMessage(key: ErrorMessageKey): string {
  return ERROR_MESSAGES[key]
}

/**
 * Parse a Supabase error into a user-friendly Indonesian message.
 *
 * Common Supabase/PostgREST error codes:
 * - PGRST116: Row not found (single row expected)
 * - 23xxx: PostgreSQL constraint violations (unique, check, FK)
 * - 42501: Insufficient privilege
 */
export function parseSupabaseError(
  error: { message?: string; code?: string } | null
): string {
  if (!error) return ERROR_MESSAGES.SERVER_ERROR

  // Row not found
  if (error.code === 'PGRST116') return ERROR_MESSAGES.NOT_FOUND

  // PostgreSQL constraint violations (23xxx)
  if (error.code?.startsWith('23')) return ERROR_MESSAGES.VALIDATION_ERROR

  // Insufficient privilege
  if (error.code === '42501') return ERROR_MESSAGES.UNAUTHORIZED

  // Network-like errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }

  return ERROR_MESSAGES.SERVER_ERROR
}
