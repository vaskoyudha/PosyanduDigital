/**
 * Indonesian name normalization for child matching.
 *
 * Handles common patterns:
 * - Honorific titles (dr., hj., prof., etc.)
 * - Islamic lineage particles (bin, binti, bintu)
 * - Muhammad spelling variants
 * - Old Dutch-era spelling (oe→u, dj→j, tj→c)
 */

/** Honorific titles to strip (lowercase, escaped for regex) */
const TITLE_PATTERNS = [
  'h\\.', 'hj\\.', 'dr\\.', 'drs\\.', 'prof\\.', 'ir\\.',
  's\\.pd', 's\\.kep', 's\\.km', 'a\\.md', 's\\.sos', 's\\.t', 's\\.e',
  'st\\.', 'spd', 'ssi', 'skm',
] as const

/** Build a regex that matches titles at start or end of string */
const titleRegex = new RegExp(
  `(?:^(?:${TITLE_PATTERNS.join('|')})\\s+)|(?:\\s+(?:${TITLE_PATTERNS.join('|')})$)`,
  'gi'
)

/** Islamic lineage particles: strip the particle AND everything after it */
const lineageRegex = /\b(?:bin|binti|bintu)\s+\S.*/gi

/** Muhammad variant normalization — abbreviated forms like "muh." need special handling since dot is non-word */
const muhammadRegex = /\b(?:muh|mhd)\.?(?=\s|$)|\b(?:mohamad|mohammad|muhammed|muhamad|muhammad)\b/gi

/** Old Dutch spelling mappings (order matters: longer patterns first) */
const SPELLING_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/oe/g, 'u'],
  [/dj/g, 'j'],
  [/tj/g, 'c'],
  [/nj/g, 'ny'],
  [/sj/g, 'sy'],
] as const

/**
 * Normalize an Indonesian name for fuzzy matching.
 *
 * Operations applied in order:
 * 1. Lowercase
 * 2. Strip leading/trailing whitespace
 * 3. Strip honorific titles
 * 4. Strip Islamic lineage particles (bin/binti/bintu + following name)
 * 5. Unify Muhammad variants → "muhammad"
 * 6. Unify old Dutch spelling → modern Indonesian
 * 7. Collapse multiple spaces → single space
 * 8. Final trim
 */
export function normalizeName(name: string): string {
  let result = name.toLowerCase().trim()

  // Strip honorific titles (may need multiple passes for edge cases)
  result = result.replace(titleRegex, '').trim()
  // Second pass in case title was at both start and end
  result = result.replace(titleRegex, '').trim()

  // Strip lineage particles and everything after
  result = result.replace(lineageRegex, '')

  // Unify Muhammad variants
  result = result.replace(muhammadRegex, 'muhammad')

  // Unify old Dutch spelling
  for (const [pattern, replacement] of SPELLING_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }

  // Collapse multiple spaces and final trim
  result = result.replace(/\s+/g, ' ').trim()

  return result
}
