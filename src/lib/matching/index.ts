/**
 * Child matching & deduplication module.
 *
 * Re-exports all public APIs for convenient imports:
 *   import { normalizeName, jaroWinklerSimilarity, computeCompositeScore } from '@/lib/matching'
 */

export { normalizeName } from './normalize'
export { jaroSimilarity, jaroWinklerSimilarity } from './jaro-winkler'
export {
  computeCompositeScore,
  type MatchCandidate,
  type MatchResult,
} from './composite-score'
