/**
 * Pure TypeScript implementation of Jaro and Jaro-Winkler string similarity.
 * No external dependencies.
 */

/**
 * Compute Jaro similarity between two strings.
 *
 * @param s1 First string
 * @param s2 Second string
 * @returns Similarity score between 0 and 1
 *
 * Formula:
 *   m = number of matching characters (within match window)
 *   t = number of transpositions / 2
 *   jaro = (m/|s1| + m/|s2| + (m-t)/m) / 3
 */
export function jaroSimilarity(s1: string, s2: string): number {
  // Edge cases
  if (s1 === s2) return 1.0
  if (s1.length === 0 || s2.length === 0) return 0.0

  const maxLen = Math.max(s1.length, s2.length)
  const matchWindow = Math.max(Math.floor(maxLen / 2) - 1, 0)

  const s1Matches = new Array<boolean>(s1.length).fill(false)
  const s2Matches = new Array<boolean>(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  // Find matching characters within the window
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  // Count transpositions
  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3

  return jaro
}

/**
 * Compute Jaro-Winkler similarity between two strings.
 *
 * Extends Jaro by boosting the score for strings that share a common prefix.
 *
 * @param s1 First string
 * @param s2 Second string
 * @param p  Prefix scaling factor (default 0.1, must not exceed 0.25)
 * @returns Similarity score between 0 and 1
 *
 * Formula:
 *   l = length of common prefix (max 4 characters)
 *   jw = jaro + l * p * (1 - jaro)
 */
export function jaroWinklerSimilarity(
  s1: string,
  s2: string,
  p: number = 0.1
): number {
  const jaro = jaroSimilarity(s1, s2)

  // Compute common prefix length (max 4 characters)
  const maxPrefix = Math.min(4, s1.length, s2.length)
  let prefixLen = 0
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLen++
    } else {
      break
    }
  }

  // Standard constraint: p should not exceed 0.25 (ensures jw <= 1.0 when l=4)
  const effectiveP = Math.min(p, 0.25)

  return jaro + prefixLen * effectiveP * (1 - jaro)
}
