/**
 * WHO Length/Height-for-Age (LHFA) LMS values — Boys, 0-60 months.
 *
 * Source: WHO Child Growth Standards (2006)
 * https://www.who.int/tools/child-growth-standards/standards/length-height-for-age
 */
import type { LMSRow } from '@/types/who'

/** Monthly LMS anchor points: [month, L, M, S] */
export const LHFA_BOYS_MONTHLY: readonly [number, number, number, number][] = [
  [0,  1, 49.8842, 0.03795],
  [1,  1, 54.7244, 0.03557],
  [2,  1, 58.4249, 0.03424],
  [3,  1, 61.4292, 0.03328],
  [4,  1, 63.8860, 0.03257],
  [5,  1, 65.9026, 0.03204],
  [6,  1, 67.6236, 0.03165],
  [7,  1, 69.1645, 0.03139],
  [8,  1, 70.5994, 0.03124],
  [9,  1, 71.9687, 0.03117],
  [10, 1, 73.2812, 0.03118],
  [11, 1, 74.5388, 0.03125],
  [12, 1, 75.7488, 0.03137],
  [13, 1, 76.9186, 0.03154],
  [14, 1, 78.0497, 0.03174],
  [15, 1, 79.1458, 0.03197],
  [16, 1, 80.2113, 0.03222],
  [17, 1, 81.2487, 0.03248],
  [18, 1, 82.2587, 0.03276],
  [19, 1, 83.2418, 0.03305],
  [20, 1, 84.1996, 0.03335],
  [21, 1, 85.1348, 0.03366],
  [22, 1, 86.0477, 0.03397],
  [23, 1, 86.9413, 0.03428],
  [24, 1, 87.8161, 0.03460],
  [25, 1, 88.0053, 0.03496],
  [26, 1, 88.8313, 0.03524],
  [27, 1, 89.6370, 0.03553],
  [28, 1, 90.4231, 0.03582],
  [29, 1, 91.1905, 0.03611],
  [30, 1, 91.9403, 0.03641],
  [31, 1, 92.6733, 0.03670],
  [32, 1, 93.3905, 0.03700],
  [33, 1, 94.0929, 0.03730],
  [34, 1, 94.7812, 0.03760],
  [35, 1, 95.4565, 0.03790],
  [36, 1, 96.1195, 0.03820],
  [37, 1, 96.7710, 0.03849],
  [38, 1, 97.4116, 0.03879],
  [39, 1, 98.0421, 0.03908],
  [40, 1, 98.6633, 0.03938],
  [41, 1, 99.2756, 0.03967],
  [42, 1, 99.8798, 0.03996],
  [43, 1, 100.4765, 0.04025],
  [44, 1, 101.0660, 0.04053],
  [45, 1, 101.6490, 0.04081],
  [46, 1, 102.2257, 0.04109],
  [47, 1, 102.7967, 0.04137],
  [48, 1, 103.3624, 0.04164],
  [49, 1, 103.9231, 0.04191],
  [50, 1, 104.4793, 0.04218],
  [51, 1, 105.0313, 0.04244],
  [52, 1, 105.5795, 0.04270],
  [53, 1, 106.1241, 0.04295],
  [54, 1, 106.6654, 0.04320],
  [55, 1, 107.2037, 0.04344],
  [56, 1, 107.7393, 0.04368],
  [57, 1, 108.2724, 0.04392],
  [58, 1, 108.8031, 0.04415],
  [59, 1, 109.3318, 0.04438],
  [60, 1, 109.8586, 0.04460],
] as const

let _cachedDaily: readonly LMSRow[] | null = null

export function getLhfaBoys(): readonly LMSRow[] {
  if (_cachedDaily) return _cachedDaily
  _cachedDaily = interpolateDaily(LHFA_BOYS_MONTHLY)
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
