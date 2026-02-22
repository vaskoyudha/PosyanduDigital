/**
 * Composite matching score for child deduplication.
 *
 * Combines name similarity, date of birth matching, mother's name similarity,
 * and NIK exact matching into a single 0-1 score.
 */

import { normalizeName } from './normalize'
import { jaroWinklerSimilarity } from './jaro-winkler'

/** A candidate child record from the database */
export interface MatchCandidate {
  child_id: string
  nama: string
  tanggal_lahir: string // ISO date (YYYY-MM-DD)
  nama_ibu: string | null
  nik: string | null
}

/** Result of matching a query against a candidate */
export interface MatchResult {
  child_id: string
  score: number // 0-1 composite score
  nameScore: number
  dobScore: number
  motherScore: number
  isNikMatch: boolean // NIK exact match → score = 1.0
}

/** Weights for composite score calculation */
const WEIGHT_NAME = 0.40
const WEIGHT_DOB = 0.35
const WEIGHT_MOTHER = 0.25

/** Tolerance for "close" date of birth matching (in days) */
const DOB_CLOSE_DAYS = 30

/**
 * Compute DOB similarity score.
 *
 * - Exact match: 1.0
 * - Same year, within ±30 days: 0.6
 * - Otherwise: 0.0
 */
function computeDobScore(queryDob: string, candidateDob: string): number {
  if (queryDob === candidateDob) return 1.0

  const qDate = new Date(queryDob + 'T00:00:00Z')
  const cDate = new Date(candidateDob + 'T00:00:00Z')

  // Check same year first
  if (qDate.getUTCFullYear() !== cDate.getUTCFullYear()) return 0.0

  // Check within ±30 days
  const diffMs = Math.abs(qDate.getTime() - cDate.getTime())
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays <= DOB_CLOSE_DAYS) return 0.6

  return 0.0
}

/**
 * Compute mother's name similarity score.
 *
 * - If either is null/empty: 0.5 (neutral — don't penalize missing data)
 * - Otherwise: Jaro-Winkler of normalized names
 */
function computeMotherScore(
  queryMother: string | undefined | null,
  candidateMother: string | null
): number {
  const qMother = queryMother?.trim()
  const cMother = candidateMother?.trim()

  if (!qMother || !cMother) return 0.5

  return jaroWinklerSimilarity(
    normalizeName(qMother),
    normalizeName(cMother)
  )
}

/**
 * Compute composite matching score between a query and a candidate child.
 *
 * NIK matching takes absolute priority:
 * - Both have NIK and they match → score = 1.0, isNikMatch = true
 * - Both have NIK and they differ → score = 0.0, isNikMatch = false
 * - Otherwise: compute weighted composite score
 */
export function computeCompositeScore(
  query: {
    nama: string
    tanggal_lahir: string
    nama_ibu?: string
    nik?: string
  },
  candidate: MatchCandidate
): MatchResult {
  const baseResult = {
    child_id: candidate.child_id,
    nameScore: 0,
    dobScore: 0,
    motherScore: 0,
  }

  // NIK priority matching
  const queryNik = query.nik?.trim()
  const candidateNik = candidate.nik?.trim()

  if (queryNik && candidateNik) {
    if (queryNik === candidateNik) {
      return {
        ...baseResult,
        score: 1.0,
        nameScore: 1.0,
        dobScore: 1.0,
        motherScore: 1.0,
        isNikMatch: true,
      }
    }
    // NIK is a unique identifier — mismatch means different child
    return {
      ...baseResult,
      score: 0.0,
      isNikMatch: false,
    }
  }

  // Compute individual scores
  const nameScore = jaroWinklerSimilarity(
    normalizeName(query.nama),
    normalizeName(candidate.nama)
  )

  const dobScore = computeDobScore(query.tanggal_lahir, candidate.tanggal_lahir)

  const motherScore = computeMotherScore(query.nama_ibu, candidate.nama_ibu)

  // Weighted composite
  const score =
    WEIGHT_NAME * nameScore +
    WEIGHT_DOB * dobScore +
    WEIGHT_MOTHER * motherScore

  return {
    child_id: candidate.child_id,
    score,
    nameScore,
    dobScore,
    motherScore,
    isNikMatch: false,
  }
}
