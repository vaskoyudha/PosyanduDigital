/**
 * WHO Z-Score Calculation Engine
 *
 * Implements the LMS method for computing Z-scores and restricted (linearized)
 * Z-scores for values beyond ±3 SD, following WHO Anthro methodology.
 */
import type { LMSRow, WfhLMSRow, ZScoreResult, MeasurementType } from '@/types/who'
import { getWfaBoys } from './tables/wfa-boys'
import { getWfaGirls } from './tables/wfa-girls'
import { getLhfaBoys } from './tables/lhfa-boys'
import { getLhfaGirls } from './tables/lhfa-girls'
import { getWfhBoys } from './tables/wfh-boys'
import { getWfhGirls } from './tables/wfh-girls'

// ---------------------------------------------------------------------------
// Core LMS Z-score formula
// ---------------------------------------------------------------------------

/**
 * Calculate Z-score using the LMS method.
 *
 * When L ≠ 0: Z = ((X/M)^L - 1) / (L × S)
 * When L = 0: Z = ln(X/M) / S
 */
export function calculateZScoreLMS(
  X: number,
  L: number,
  M: number,
  S: number
): number {
  if (X <= 0 || M <= 0 || S <= 0) return NaN
  if (L === 0) {
    return Math.log(X / M) / S
  }
  return (Math.pow(X / M, L) - 1) / (L * S)
}

/**
 * Calculate the SD boundary value at a given z using LMS parameters.
 * SD(z) = M × (1 + L × S × z)^(1/L)
 */
function sdValue(z: number, L: number, M: number, S: number): number {
  if (L === 0) {
    return M * Math.exp(S * z)
  }
  return M * Math.pow(1 + L * S * z, 1 / L)
}

/**
 * Calculate restricted (linearized) Z-score.
 *
 * When raw Z > 3: Zind = 3 + (X - SD3pos) / SD23pos
 * When raw Z < -3: Zind = -3 + (X - SD3neg) / SD23neg
 *
 * This prevents extreme Z-scores from distorting calculations.
 */
export function calculateRestrictedZScore(
  X: number,
  L: number,
  M: number,
  S: number
): ZScoreResult {
  const rawZ = calculateZScoreLMS(X, L, M, S)

  if (isNaN(rawZ)) {
    return { zscore: NaN, restricted: false }
  }

  if (rawZ > 3) {
    const SD3pos = sdValue(3, L, M, S)
    const SD2pos = sdValue(2, L, M, S)
    const SD23pos = SD3pos - SD2pos
    const restricted = 3 + (X - SD3pos) / SD23pos
    return { zscore: restricted, restricted: true }
  }

  if (rawZ < -3) {
    const SD3neg = sdValue(-3, L, M, S)
    const SD2neg = sdValue(-2, L, M, S)
    const SD23neg = SD2neg - SD3neg
    const restricted = -3 + (X - SD3neg) / SD23neg
    return { zscore: restricted, restricted: true }
  }

  return { zscore: rawZ, restricted: false }
}

// ---------------------------------------------------------------------------
// Table lookup helpers
// ---------------------------------------------------------------------------

/** Find LMS values by day from an age-indexed table (0-1856 days). */
function lookupByDay(table: readonly LMSRow[], day: number): LMSRow | null {
  if (day < 0 || day > 1856) return null
  // Days are indexed 0..1856, so direct access
  const rounded = Math.round(day)
  if (rounded >= 0 && rounded < table.length) {
    return table[rounded]
  }
  return null
}

/** Find LMS values by height from a WFH table (45.0-120.0 cm at 0.1 steps). */
function lookupByHeight(
  table: readonly WfhLMSRow[],
  heightCm: number
): WfhLMSRow | null {
  const minHeight = table[0].height
  const maxHeight = table[table.length - 1].height

  if (heightCm < minHeight || heightCm > maxHeight) return null

  // Index by rounding to nearest 0.1cm
  const idx = Math.round((heightCm - minHeight) * 10)
  if (idx >= 0 && idx < table.length) {
    return table[idx]
  }
  return null
}

// ---------------------------------------------------------------------------
// PB/TB conversion
// ---------------------------------------------------------------------------

/**
 * Adjust height measurement for PB/TB conversion.
 *
 * WHO convention:
 * - Children < 24 months are measured lying down (PB = recumbent length).
 * - Children ≥ 24 months are measured standing up (TB = standing height).
 * - Recumbent length is on average 0.7 cm greater than standing height.
 *
 * For WFA/LHFA: no conversion needed (they match measurement position by age).
 * For WFH: the WHO table is indexed by "length" for <87cm and "height" for ≥87cm,
 *   but we use a combined table, so we need to convert to a consistent measure.
 *
 * Conversion rules:
 * - If age_days < 730 and measurement was standing (TB) → add 0.7cm (convert TB→PB)
 * - If age_days >= 730 and measurement was recumbent (PB) → subtract 0.7cm (convert PB→TB)
 */
export function adjustHeight(
  heightCm: number,
  ageDays: number,
  measurementType: MeasurementType
): number {
  if (ageDays < 730 && measurementType === 'TB') {
    // Child < 24mo measured standing; convert to recumbent for consistency
    return heightCm + 0.7
  }
  if (ageDays >= 730 && measurementType === 'PB') {
    // Child ≥ 24mo measured recumbent; convert to standing for consistency
    return heightCm - 0.7
  }
  return heightCm
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate Weight-for-Age (BB/U) Z-score.
 * @returns Z-score or null if out of range (age 0-1856 days).
 */
export function calculateWFA(
  weightKg: number,
  ageDays: number,
  sex: 'L' | 'P'
): number | null {
  const table = sex === 'L' ? getWfaBoys() : getWfaGirls()
  const lms = lookupByDay(table, ageDays)
  if (!lms) return null

  const result = calculateRestrictedZScore(weightKg, lms.L, lms.M, lms.S)
  return isNaN(result.zscore) ? null : result.zscore
}

/**
 * Calculate Length/Height-for-Age (TB/U) Z-score.
 * @returns Z-score or null if out of range.
 */
export function calculateLHFA(
  heightCm: number,
  ageDays: number,
  sex: 'L' | 'P'
): number | null {
  const table = sex === 'L' ? getLhfaBoys() : getLhfaGirls()
  const lms = lookupByDay(table, ageDays)
  if (!lms) return null

  const result = calculateRestrictedZScore(heightCm, lms.L, lms.M, lms.S)
  return isNaN(result.zscore) ? null : result.zscore
}

/**
 * Calculate Weight-for-Height (BB/TB) Z-score.
 * Height is adjusted based on age and measurement type (PB/TB).
 * @returns Z-score or null if height out of range (45.0-120.0cm).
 */
export function calculateWFH(
  weightKg: number,
  heightCm: number,
  ageDays: number,
  sex: 'L' | 'P',
  measurementType: MeasurementType
): number | null {
  // Adjust height for PB/TB conversion
  const adjustedHeight = adjustHeight(heightCm, ageDays, measurementType)

  const table = sex === 'L' ? getWfhBoys() : getWfhGirls()
  const lms = lookupByHeight(table, adjustedHeight)
  if (!lms) return null

  const result = calculateRestrictedZScore(weightKg, lms.L, lms.M, lms.S)
  return isNaN(result.zscore) ? null : result.zscore
}
