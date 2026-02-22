/**
 * NIK (Nomor Induk Kependudukan) validation utilities.
 * NIK is a 16-digit Indonesian national ID number.
 */

/**
 * Validate NIK: must be exactly 16 digits (numbers only).
 * Returns true if valid, false otherwise.
 */
export function validateNIK(nik: string): boolean {
  if (!nik) return false
  return /^\d{16}$/.test(nik.trim())
}

/**
 * Mask NIK: show first 6 digits, mask middle 6 with '*', show last 4.
 * e.g., "3201010101010001" → "320101******0001"
 */
export function maskNIK(nik: string): string {
  if (!nik || nik.length < 16) return nik
  const cleaned = nik.replace(/\D/g, '')
  if (cleaned.length !== 16) return nik
  return `${cleaned.slice(0, 6)}******${cleaned.slice(12, 16)}`
}

/**
 * Format NIK with dashes for visual grouping: XXXX-XXXX-XXXX-XXXX
 * e.g., "3201010101010001" → "3201-0101-0101-0001"
 */
export function formatNIK(nik: string): string {
  const digits = nik.replace(/\D/g, '')
  if (digits.length !== 16) return nik
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`
}

/**
 * Strip all non-digit characters from NIK input.
 */
export function stripNIK(nik: string): string {
  return nik.replace(/\D/g, '')
}
