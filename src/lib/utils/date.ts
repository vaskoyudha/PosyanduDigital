/**
 * Indonesian date utilities
 * Display: DD/MM/YYYY
 * Storage: YYYY-MM-DD (ISO 8601)
 */

/**
 * Format a date string (YYYY-MM-DD) or Date object to Indonesian display format DD/MM/YYYY
 */
export function formatDateIndonesian(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  if (isNaN(d.getTime())) return '-'
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Parse Indonesian date string (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY) to ISO 8601 (YYYY-MM-DD)
 * Returns null if invalid
 */
export function parseIndonesianDate(dateStr: string): string | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim()
  // Match DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const match = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
}

/**
 * Format a month (YYYY-MM) to Indonesian display (e.g., "Januari 2025")
 */
export function formatMonthIndonesian(yearMonth: string): string {
  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const [year, month] = yearMonth.split('-')
  const m = parseInt(month, 10)
  if (m < 1 || m > 12) return yearMonth
  return `${MONTHS[m - 1]} ${year}`
}

/**
 * Get current month as YYYY-MM
 */
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
}

/**
 * Get first day of a month (YYYY-MM) as ISO date string YYYY-MM-01
 */
export function getFirstDayOfMonth(yearMonth: string): string {
  return `${yearMonth}-01`
}

/**
 * Get the last N months as YYYY-MM strings, in descending order (most recent first)
 */
export function getLastNMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`)
  }
  return months
}
