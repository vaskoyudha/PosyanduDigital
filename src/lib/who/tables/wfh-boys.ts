/**
 * WHO Weight-for-Height (WFH) LMS values — Boys, 45.0-120.0 cm.
 *
 * Source: WHO Child Growth Standards (2006)
 * https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height
 *
 * These are anchor points at whole-cm intervals. For 0.1cm precision,
 * linear interpolation is used between adjacent anchor points.
 * Height values in cm.
 */
import type { WfhLMSRow } from '@/types/who'

/**
 * WFH Boys anchor points: [height_cm, L, M, S]
 * Height range: 45.0 to 120.0 cm (whole cm).
 * L values for WFH are not constant (unlike WFA).
 */
export const WFH_BOYS_ANCHORS: readonly [number, number, number, number][] = [
  [45.0, -0.3521, 2.441, 0.09182],
  [46.0, -0.3521, 2.528, 0.09153],
  [47.0, -0.3521, 2.620, 0.09124],
  [48.0, -0.3521, 2.717, 0.09094],
  [49.0, -0.3521, 2.820, 0.09065],
  [50.0, -0.3521, 2.931, 0.09036],
  [51.0, -0.3521, 3.049, 0.09007],
  [52.0, -0.3521, 3.170, 0.08979],
  [53.0, -0.3521, 3.292, 0.08952],
  [54.0, -0.3521, 3.418, 0.08927],
  [55.0, -0.3521, 3.546, 0.08904],
  [56.0, -0.3521, 3.680, 0.08884],
  [57.0, -0.3521, 3.817, 0.08867],
  [58.0, -0.3521, 3.959, 0.08854],
  [59.0, -0.3521, 4.105, 0.08845],
  [60.0, -0.3521, 4.252, 0.08841],
  [61.0, -0.3521, 4.400, 0.08842],
  [62.0, -0.3521, 4.547, 0.08849],
  [63.0, -0.3521, 4.693, 0.08860],
  [64.0, -0.3521, 4.836, 0.08877],
  [65.0, -0.3521, 4.976, 0.08899],
  [66.0, -0.3521, 5.114, 0.08927],
  [67.0, -0.3521, 5.251, 0.08960],
  [68.0, -0.3521, 5.389, 0.08999],
  [69.0, -0.3521, 5.528, 0.09042],
  [70.0, -0.3521, 5.669, 0.09091],
  [71.0, -0.3521, 5.812, 0.09144],
  [72.0, -0.3521, 5.959, 0.09201],
  [73.0, -0.3521, 6.108, 0.09262],
  [74.0, -0.3521, 6.260, 0.09327],
  [75.0, -0.3521, 6.413, 0.09395],
  [76.0, -0.3521, 6.568, 0.09466],
  [77.0, -0.3521, 6.723, 0.09539],
  [78.0, -0.3521, 6.879, 0.09614],
  [79.0, -0.3521, 7.036, 0.09691],
  [80.0, -0.3521, 7.193, 0.09770],
  [81.0, -0.3521, 7.352, 0.09850],
  [82.0, -0.3521, 7.510, 0.09932],
  [83.0, -0.3521, 7.669, 0.10014],
  [84.0, -0.3521, 7.829, 0.10098],
  [85.0, -0.3521, 7.990, 0.10183],
  [86.0, -0.3521, 8.153, 0.10268],
  [87.0, -0.3521, 8.318, 0.10354],
  [88.0, -0.3521, 8.484, 0.10441],
  [89.0, -0.3521, 8.651, 0.10528],
  [90.0, -0.3521, 8.819, 0.10617],
  [91.0, -0.3521, 8.988, 0.10706],
  [92.0, -0.3521, 9.160, 0.10796],
  [93.0, -0.3521, 9.334, 0.10886],
  [94.0, -0.3521, 9.511, 0.10978],
  [95.0, -0.3521, 9.691, 0.11070],
  [96.0, -0.3521, 9.875, 0.11163],
  [97.0, -0.3521, 10.063, 0.11256],
  [98.0, -0.3521, 10.256, 0.11350],
  [99.0, -0.3521, 10.454, 0.11443],
  [100.0, -0.3521, 10.657, 0.11536],
  [101.0, -0.3521, 10.866, 0.11629],
  [102.0, -0.3521, 11.081, 0.11720],
  [103.0, -0.3521, 11.303, 0.11810],
  [104.0, -0.3521, 11.531, 0.11898],
  [105.0, -0.3521, 11.766, 0.11985],
  [106.0, -0.3521, 12.008, 0.12072],
  [107.0, -0.3521, 12.258, 0.12160],
  [108.0, -0.3521, 12.515, 0.12249],
  [109.0, -0.3521, 12.780, 0.12340],
  [110.0, -0.3521, 13.053, 0.12433],
  [111.0, -0.3521, 13.334, 0.12528],
  [112.0, -0.3521, 13.623, 0.12625],
  [113.0, -0.3521, 13.920, 0.12723],
  [114.0, -0.3521, 14.225, 0.12822],
  [115.0, -0.3521, 14.539, 0.12920],
  [116.0, -0.3521, 14.861, 0.13017],
  [117.0, -0.3521, 15.191, 0.13112],
  [118.0, -0.3521, 15.529, 0.13204],
  [119.0, -0.3521, 15.875, 0.13293],
  [120.0, -0.3521, 16.228, 0.13378],
] as const

/**
 * Pre-computed WFH table at 0.1cm precision.
 * Lazily generated on first access.
 */
let _cached: readonly WfhLMSRow[] | null = null

export function getWfhBoys(): readonly WfhLMSRow[] {
  if (_cached) return _cached
  _cached = interpolateWfh(WFH_BOYS_ANCHORS)
  return _cached
}

/**
 * Linear interpolation of whole-cm anchors to 0.1cm precision.
 * Returns rows from 45.0 to 120.0 in 0.1cm steps.
 */
function interpolateWfh(
  anchors: readonly (readonly [number, number, number, number])[]
): WfhLMSRow[] {
  const result: WfhLMSRow[] = []
  const minH = anchors[0][0]
  const maxH = anchors[anchors.length - 1][0]

  for (let h10 = Math.round(minH * 10); h10 <= Math.round(maxH * 10); h10++) {
    const height = h10 / 10
    // Find bounding anchors
    let lowerIdx = 0
    for (let i = 0; i < anchors.length - 1; i++) {
      if (anchors[i][0] <= height) lowerIdx = i
    }
    if (lowerIdx >= anchors.length - 1) lowerIdx = anchors.length - 2

    const [h0, L0, M0, S0] = anchors[lowerIdx]
    const [h1, L1, M1, S1] = anchors[lowerIdx + 1]
    const frac = (height - h0) / (h1 - h0)

    result.push({
      height: Math.round(height * 10) / 10, // avoid floating-point issues
      L: L0 + (L1 - L0) * frac,
      M: M0 + (M1 - M0) * frac,
      S: S0 + (S1 - S0) * frac,
    })
  }

  return result
}
