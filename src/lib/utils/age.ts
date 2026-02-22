/**
 * Age calculation utilities following WHO methodology.
 *
 * WHO method:
 * - age_days = exact calendar day difference (measurement_date - birth_date)
 * - age_months = floor(age_days / 30.4375)
 * - For LMS table lookup: use age_days for day-exact tables (0-1856 days)
 */

/**
 * Calculate exact age in days between two dates.
 */
export function ageInDays(
  birthDate: string | Date,
  measurementDate: string | Date
): number {
  const birth =
    typeof birthDate === 'string'
      ? new Date(birthDate + 'T00:00:00')
      : birthDate
  const measurement =
    typeof measurementDate === 'string'
      ? new Date(measurementDate + 'T00:00:00')
      : measurementDate
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((measurement.getTime() - birth.getTime()) / msPerDay)
}

/**
 * Calculate age in completed months (WHO method: floor(days / 30.4375)).
 */
export function ageInMonths(
  birthDate: string | Date,
  measurementDate: string | Date
): number {
  const days = ageInDays(birthDate, measurementDate)
  return Math.floor(days / 30.4375)
}

/**
 * Format age in months to Indonesian display string.
 * e.g., 14 → "1 tahun 2 bulan"
 */
export function formatAgeIndonesian(months: number): string {
  if (months < 0) return '-'
  if (months < 1) return 'Kurang dari 1 bulan'
  if (months < 12) return `${months} bulan`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years} tahun`
  return `${years} tahun ${remainingMonths} bulan`
}

/**
 * Check if a child is still a balita (under 5 years = under 60 months).
 */
export function isBalita(
  birthDate: string | Date,
  referenceDate?: string | Date
): boolean {
  const ref = referenceDate ?? new Date()
  const months = ageInMonths(birthDate, ref)
  return months < 60
}

/**
 * Get the age group string for KBM lookup.
 * Returns one of: '0-3', '4-6', '7-9', '10-12', '13-24', '25-60'
 */
export function getAgeGroup(ageMonths: number): string {
  if (ageMonths <= 3) return '0-3'
  if (ageMonths <= 6) return '4-6'
  if (ageMonths <= 9) return '7-9'
  if (ageMonths <= 12) return '10-12'
  if (ageMonths <= 24) return '13-24'
  return '25-60'
}
