/**
 * WHO Z-Score Engine & Nutrition Classification
 *
 * Re-exports all public APIs from the WHO module.
 */

// Z-score calculation
export {
  calculateZScoreLMS,
  calculateRestrictedZScore,
  adjustHeight,
  calculateWFA,
  calculateLHFA,
  calculateWFH,
} from './zscore'

// Indonesian nutrition classification
export {
  classifyBBU,
  classifyTBU,
  classifyBBTB,
  classifyAll,
} from './classify'

// KBM and N/T/BGM/2T logic
export {
  getKBM,
  determineNT,
  checkBGM,
  check2T,
} from './kbm'

// Tables (for advanced usage / charts)
export { getWfaBoys } from './tables/wfa-boys'
export { getWfaGirls } from './tables/wfa-girls'
export { getLhfaBoys } from './tables/lhfa-boys'
export { getLhfaGirls } from './tables/lhfa-girls'
export { getWfhBoys } from './tables/wfh-boys'
export { getWfhGirls } from './tables/wfh-girls'
