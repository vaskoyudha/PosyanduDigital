/**
 * Decimal handling utilities
 *
 * Indonesia uses comma as decimal separator in everyday use.
 * e-PPGBM and all database storage use period (POSIX standard).
 *
 * Rules:
 * - ALL storage: period decimal (PostgreSQL DECIMAL type)
 * - ALL inputs: force period, reject comma keypress, auto-convert on paste
 * - Display: can show comma if preferred (format on render only)
 * - Export: always period
 */

/**
 * Convert any decimal string (with comma or period) to period-decimal string.
 * Returns null if not a valid number.
 */
export function normalizeDecimal(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).trim().replace(',', '.')
  const num = parseFloat(normalized)
  if (isNaN(num)) return null
  return normalized
}

/**
 * Parse a decimal string to a number, handling comma separator.
 * Returns null if not a valid number.
 */
export function parseDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).trim().replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

/**
 * Format a number to Indonesian display format with comma decimal separator.
 * e.g., 12.5 → "12,5"
 */
export function formatDecimalIndonesian(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined) return '-'
  return value.toFixed(decimals).replace('.', ',')
}

/**
 * Format a number for storage/export with period decimal separator.
 * e.g., 12.5 → "12.5"
 */
export function formatDecimalExport(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return ''
  return value.toFixed(decimals)
}

/**
 * Validate that a weight value is within biological plausibility range (kg).
 */
export function isValidWeight(kg: number): boolean {
  return kg >= 0.5 && kg <= 30
}

/**
 * Validate that a height value is within biological plausibility range (cm).
 */
export function isValidHeight(cm: number): boolean {
  return cm >= 30 && cm <= 130
}

/**
 * Validate that a head circumference value is within biological plausibility range (cm).
 */
export function isValidHeadCircumference(cm: number): boolean {
  return cm >= 25 && cm <= 60
}

/**
 * Validate that a MUAC value is within biological plausibility range (cm).
 */
export function isValidMUAC(cm: number): boolean {
  return cm >= 7 && cm <= 25
}
