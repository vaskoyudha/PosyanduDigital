/**
 * KBM (Kenaikan Berat Badan Minimum) — Minimum Weight Gain logic
 *
 * Determines N/T/O (naik/tidak naik/tidak ditimbang) status based on
 * weight gain relative to KBM thresholds by age group.
 *
 * Also determines BGM (Bawah Garis Merah) and 2T (two consecutive T months).
 */
import type { NaikStatus } from '@/types/who'
import { ZSCORE_SEVERE_LOW } from '@/lib/utils/constants'

// ---------------------------------------------------------------------------
// KBM thresholds (grams per month)
// ---------------------------------------------------------------------------

/**
 * Minimum weight gain per month by age group (in grams).
 *
 * Note: The task specification says 0-3 months = 800g/month, but
 * the existing constants.ts has 700g/month. We use the values from
 * constants.ts for consistency with the existing codebase.
 * These can be adjusted if the Permenkes reference specifies differently.
 */
const KBM_THRESHOLDS: readonly { maxAgeDays: number; gramsPerMonth: number }[] = [
  { maxAgeDays: Math.round(3 * 30.4375),  gramsPerMonth: 800 }, // 0-3 months
  { maxAgeDays: Math.round(6 * 30.4375),  gramsPerMonth: 600 }, // 4-6 months
  { maxAgeDays: Math.round(9 * 30.4375),  gramsPerMonth: 400 }, // 7-9 months
  { maxAgeDays: Math.round(11 * 30.4375), gramsPerMonth: 300 }, // 10-11 months
  { maxAgeDays: Math.round(23 * 30.4375), gramsPerMonth: 200 }, // 12-23 months
  { maxAgeDays: Math.round(59 * 30.4375), gramsPerMonth: 150 }, // 24-59 months
]

/**
 * Get the KBM (minimum weight gain) in grams for a child of the given age.
 * @param ageDays - Age in days
 * @returns Minimum weight gain in grams per month
 */
export function getKBM(ageDays: number): number {
  for (const threshold of KBM_THRESHOLDS) {
    if (ageDays <= threshold.maxAgeDays) {
      return threshold.gramsPerMonth
    }
  }
  // Fallback for age >= 60 months (should not normally occur for balita)
  return 150
}

// ---------------------------------------------------------------------------
// N/T/O Determination
// ---------------------------------------------------------------------------

/**
 * Determine N/T/O status based on weight gain.
 *
 * N = naik: weight gained ≥ KBM for the child's age group
 * T = tidak naik: weight gained < KBM, or weight decreased
 * O = tidak ditimbang: no previous measurement (null previousWeightG)
 *
 * @param currentWeightG - Current weight in grams
 * @param previousWeightG - Previous month's weight in grams, or null if not measured
 * @param ageDays - Child's age in days (used to look up KBM threshold)
 * @returns 'N', 'T', or 'O'
 */
export function determineNT(
  currentWeightG: number,
  previousWeightG: number | null,
  ageDays: number
): NaikStatus {
  if (previousWeightG === null) return 'O'

  const gain = currentWeightG - previousWeightG
  const kbm = getKBM(ageDays)

  return gain >= kbm ? 'N' : 'T'
}

// ---------------------------------------------------------------------------
// BGM Determination
// ---------------------------------------------------------------------------

/**
 * Check if a child is BGM (Bawah Garis Merah = below the red line).
 * BGM means the weight-for-age Z-score is < -3 (severely underweight)
 * or the child has edema.
 *
 * @param zScoreBBU - Weight-for-age Z-score, or null if not calculable
 * @param hasEdema - Whether the child has bilateral pitting edema
 * @returns true if the child is BGM
 */
export function checkBGM(zScoreBBU: number | null, hasEdema: boolean): boolean {
  if (hasEdema) return true
  if (zScoreBBU === null) return false
  return zScoreBBU < ZSCORE_SEVERE_LOW
}

/**
 * Check if two consecutive T months occurred (2T condition).
 *
 * @param ntHistory - Array of N/T/O status for consecutive months, most recent last.
 *   Must have at least 2 entries.
 * @returns true if the last two entries are both 'T'
 */
export function check2T(ntHistory: readonly NaikStatus[]): boolean {
  if (ntHistory.length < 2) return false
  const last = ntHistory[ntHistory.length - 1]
  const secondLast = ntHistory[ntHistory.length - 2]
  return last === 'T' && secondLast === 'T'
}
