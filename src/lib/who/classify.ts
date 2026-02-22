/**
 * Indonesian Nutrition Classification (Permenkes No. 2/2020)
 *
 * Classifies children's nutritional status based on WHO Z-scores
 * into Indonesian health categories.
 */
import type {
  BBUStatus,
  TBUStatus,
  BBTBStatus,
  NutritionClassification,
  MeasurementType,
} from '@/types/who'
import {
  ZSCORE_SEVERE_LOW,
  ZSCORE_MODERATE_LOW,
  ZSCORE_MODERATE_HIGH,
  ZSCORE_SEVERE_HIGH,
} from '@/lib/utils/constants'
import { calculateWFA, calculateLHFA, calculateWFH } from './zscore'

// ---------------------------------------------------------------------------
// BB/U (Weight-for-Age)
// ---------------------------------------------------------------------------

/**
 * Classify weight-for-age status.
 *
 * Z < -3       → gizi_buruk (severely underweight)
 * -3 ≤ Z < -2  → gizi_kurang (underweight)
 * -2 ≤ Z ≤ 2   → gizi_baik (normal)
 * Z > 2        → gizi_lebih (overweight)
 *
 * If edema is present → always gizi_buruk.
 */
export function classifyBBU(zScore: number, hasEdema: boolean): BBUStatus {
  if (hasEdema) return 'gizi_buruk'
  if (zScore < ZSCORE_SEVERE_LOW) return 'gizi_buruk'
  if (zScore < ZSCORE_MODERATE_LOW) return 'gizi_kurang'
  if (zScore <= ZSCORE_MODERATE_HIGH) return 'gizi_baik'
  return 'gizi_lebih'
}

// ---------------------------------------------------------------------------
// TB/U (Length/Height-for-Age)
// ---------------------------------------------------------------------------

/**
 * Classify length/height-for-age status.
 *
 * Z < -3       → sangat_pendek (severely stunted)
 * -3 ≤ Z < -2  → pendek (stunted)
 * -2 ≤ Z ≤ 3   → normal
 * Z > 3        → tinggi (tall)
 */
export function classifyTBU(zScore: number): TBUStatus {
  if (zScore < ZSCORE_SEVERE_LOW) return 'sangat_pendek'
  if (zScore < ZSCORE_MODERATE_LOW) return 'pendek'
  if (zScore <= ZSCORE_SEVERE_HIGH) return 'normal'
  return 'tinggi'
}

// ---------------------------------------------------------------------------
// BB/TB (Weight-for-Height)
// ---------------------------------------------------------------------------

/**
 * Classify weight-for-height status.
 *
 * Z < -3       → gizi_buruk (severe wasting)
 * -3 ≤ Z < -2  → gizi_kurang (wasting)
 * -2 ≤ Z ≤ 2   → gizi_baik (normal)
 * 2 < Z ≤ 3    → gizi_lebih (overweight)
 * Z > 3        → obesitas (obese)
 *
 * If edema is present → always gizi_buruk.
 */
export function classifyBBTB(zScore: number, hasEdema: boolean): BBTBStatus {
  if (hasEdema) return 'gizi_buruk'
  if (zScore < ZSCORE_SEVERE_LOW) return 'gizi_buruk'
  if (zScore < ZSCORE_MODERATE_LOW) return 'gizi_kurang'
  if (zScore <= ZSCORE_MODERATE_HIGH) return 'gizi_baik'
  if (zScore <= ZSCORE_SEVERE_HIGH) return 'gizi_lebih'
  return 'obesitas'
}

// ---------------------------------------------------------------------------
// Combined classification
// ---------------------------------------------------------------------------

/**
 * Calculate all three nutrition indicators and classify.
 *
 * @param params.weightKg - Weight in kilograms
 * @param params.heightCm - Height/length in centimeters
 * @param params.ageDays - Age in days (0-1856)
 * @param params.sex - 'L' (laki-laki/male) or 'P' (perempuan/female)
 * @param params.hasEdema - Whether the child has bilateral pitting edema
 * @param params.measurementType - 'PB' (recumbent) or 'TB' (standing)
 */
export function classifyAll(params: {
  weightKg: number
  heightCm: number
  ageDays: number
  sex: 'L' | 'P'
  hasEdema: boolean
  measurementType: MeasurementType
}): NutritionClassification {
  const { weightKg, heightCm, ageDays, sex, hasEdema, measurementType } = params

  // Calculate Z-scores
  const zBBU = calculateWFA(weightKg, ageDays, sex)
  const zTBU = calculateLHFA(heightCm, ageDays, sex)
  const zBBTB = calculateWFH(weightKg, heightCm, ageDays, sex, measurementType)

  // Classify
  const bb_u: BBUStatus | null = zBBU !== null ? classifyBBU(zBBU, hasEdema) : (hasEdema ? 'gizi_buruk' : null)
  const tb_u: TBUStatus | null = zTBU !== null ? classifyTBU(zTBU) : null
  const bb_tb: BBTBStatus | null = zBBTB !== null ? classifyBBTB(zBBTB, hasEdema) : (hasEdema ? 'gizi_buruk' : null)

  return {
    bb_u,
    tb_u,
    bb_tb,
    zscore_bb_u: zBBU,
    zscore_tb_u: zTBU,
    zscore_bb_tb: zBBTB,
  }
}
