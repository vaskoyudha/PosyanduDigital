/**
 * WHO Length/Height-for-Age (LHFA) LMS values — Girls, 0-60 months.
 *
 * Source: WHO Child Growth Standards (2006)
 * https://www.who.int/tools/child-growth-standards/standards/length-height-for-age
 */
import type { LMSRow } from '@/types/who'

/** Monthly LMS anchor points: [month, L, M, S] */
export const LHFA_GIRLS_MONTHLY: readonly [number, number, number, number][] = [
  [0,  1, 49.1477, 0.03790],
  [1,  1, 53.6872, 0.03610],
  [2,  1, 57.0673, 0.03514],
  [3,  1, 59.8029, 0.03448],
  [4,  1, 62.0899, 0.03401],
  [5,  1, 64.0301, 0.03368],
  [6,  1, 65.7311, 0.03348],
  [7,  1, 67.2873, 0.03338],
  [8,  1, 68.7498, 0.03336],
  [9,  1, 70.1435, 0.03341],
  [10, 1, 71.4818, 0.03351],
  [11, 1, 72.7710, 0.03365],
  [12, 1, 74.0153, 0.03382],
  [13, 1, 75.2170, 0.03403],
  [14, 1, 76.3817, 0.03426],
  [15, 1, 77.5119, 0.03451],
  [16, 1, 78.6105, 0.03477],
  [17, 1, 79.6797, 0.03505],
  [18, 1, 80.7207, 0.03533],
  [19, 1, 81.7351, 0.03562],
  [20, 1, 82.7245, 0.03592],
  [21, 1, 83.6898, 0.03622],
  [22, 1, 84.6318, 0.03652],
  [23, 1, 85.5513, 0.03682],
  [24, 1, 86.4508, 0.03713],
  [25, 1, 86.5979, 0.03748],
  [26, 1, 87.4669, 0.03776],
  [27, 1, 88.3165, 0.03805],
  [28, 1, 89.1479, 0.03833],
  [29, 1, 89.9620, 0.03862],
  [30, 1, 90.7599, 0.03891],
  [31, 1, 91.5424, 0.03919],
  [32, 1, 92.3105, 0.03948],
  [33, 1, 93.0647, 0.03977],
  [34, 1, 93.8061, 0.04006],
  [35, 1, 94.5352, 0.04035],
  [36, 1, 95.2529, 0.04064],
  [37, 1, 95.9598, 0.04093],
  [38, 1, 96.6566, 0.04121],
  [39, 1, 97.3438, 0.04150],
  [40, 1, 98.0223, 0.04178],
  [41, 1, 98.6926, 0.04207],
  [42, 1, 99.3551, 0.04235],
  [43, 1, 100.0109, 0.04263],
  [44, 1, 100.6601, 0.04291],
  [45, 1, 101.3033, 0.04318],
  [46, 1, 101.9412, 0.04346],
  [47, 1, 102.5740, 0.04373],
  [48, 1, 103.2023, 0.04400],
  [49, 1, 103.8265, 0.04427],
  [50, 1, 104.4471, 0.04453],
  [51, 1, 105.0644, 0.04479],
  [52, 1, 105.6790, 0.04505],
  [53, 1, 106.2913, 0.04531],
  [54, 1, 106.9014, 0.04556],
  [55, 1, 107.5098, 0.04581],
  [56, 1, 108.1167, 0.04605],
  [57, 1, 108.7223, 0.04629],
  [58, 1, 109.3268, 0.04653],
  [59, 1, 109.9307, 0.04676],
  [60, 1, 110.5340, 0.04699],
] as const

let _cachedDaily: readonly LMSRow[] | null = null

export function getLhfaGirls(): readonly LMSRow[] {
  if (_cachedDaily) return _cachedDaily
  _cachedDaily = interpolateDaily(LHFA_GIRLS_MONTHLY)
  return _cachedDaily
}

function interpolateDaily(
  monthly: readonly (readonly [number, number, number, number])[]
): LMSRow[] {
  const DAYS_PER_MONTH = 30.4375
  const maxDay = 1856
  const result: LMSRow[] = []

  for (let day = 0; day <= maxDay; day++) {
    const monthExact = day / DAYS_PER_MONTH
    let lowerIdx = Math.floor(monthExact)
    if (lowerIdx >= monthly.length - 1) lowerIdx = monthly.length - 2
    if (lowerIdx < 0) lowerIdx = 0
    const upperIdx = lowerIdx + 1

    const [, L0, M0, S0] = monthly[lowerIdx]
    const [, L1, M1, S1] = monthly[upperIdx]
    const frac = monthExact - lowerIdx

    result.push({
      day,
      L: L0 + (L1 - L0) * frac,
      M: M0 + (M1 - M0) * frac,
      S: S0 + (S1 - S0) * frac,
    })
  }

  return result
}
