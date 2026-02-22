/**
 * Unit tests for Indonesian Nutrition Classification and KBM
 */
import { describe, it, expect } from 'vitest'
import { classifyBBU, classifyTBU, classifyBBTB, classifyAll } from '../classify'
import { getKBM, determineNT, checkBGM, check2T } from '../kbm'

// ---------------------------------------------------------------------------
// BB/U (Weight-for-Age) Classification
// ---------------------------------------------------------------------------
describe('classifyBBU', () => {
  it('1. Z < -3 → gizi_buruk', () => {
    expect(classifyBBU(-3.5, false)).toBe('gizi_buruk')
  })

  it('2. Z = -3 → gizi_kurang (boundary: -3 ≤ Z < -2)', () => {
    expect(classifyBBU(-3, false)).toBe('gizi_kurang')
  })

  it('3. -3 ≤ Z < -2 → gizi_kurang', () => {
    expect(classifyBBU(-2.5, false)).toBe('gizi_kurang')
  })

  it('4. Z = -2 → gizi_baik (boundary: -2 ≤ Z ≤ 2)', () => {
    expect(classifyBBU(-2, false)).toBe('gizi_baik')
  })

  it('5. -2 ≤ Z ≤ 2 → gizi_baik', () => {
    expect(classifyBBU(0, false)).toBe('gizi_baik')
    expect(classifyBBU(1.5, false)).toBe('gizi_baik')
  })

  it('6. Z = 2 → gizi_baik (upper boundary)', () => {
    expect(classifyBBU(2, false)).toBe('gizi_baik')
  })

  it('7. Z > 2 → gizi_lebih', () => {
    expect(classifyBBU(2.5, false)).toBe('gizi_lebih')
  })

  it('8. Edema → always gizi_buruk regardless of Z-score', () => {
    expect(classifyBBU(0, true)).toBe('gizi_buruk')
    expect(classifyBBU(2.5, true)).toBe('gizi_buruk')
  })
})

// ---------------------------------------------------------------------------
// TB/U (Height-for-Age) Classification
// ---------------------------------------------------------------------------
describe('classifyTBU', () => {
  it('9. Z < -3 → sangat_pendek', () => {
    expect(classifyTBU(-3.5)).toBe('sangat_pendek')
  })

  it('10. Z = -3 → pendek', () => {
    expect(classifyTBU(-3)).toBe('pendek')
  })

  it('11. -3 ≤ Z < -2 → pendek', () => {
    expect(classifyTBU(-2.5)).toBe('pendek')
  })

  it('12. Z = -2 → normal', () => {
    expect(classifyTBU(-2)).toBe('normal')
  })

  it('13. -2 ≤ Z ≤ 3 → normal', () => {
    expect(classifyTBU(0)).toBe('normal')
    expect(classifyTBU(2.5)).toBe('normal')
  })

  it('14. Z = 3 → normal (upper boundary)', () => {
    expect(classifyTBU(3)).toBe('normal')
  })

  it('15. Z > 3 → tinggi', () => {
    expect(classifyTBU(3.5)).toBe('tinggi')
  })
})

// ---------------------------------------------------------------------------
// BB/TB (Weight-for-Height) Classification
// ---------------------------------------------------------------------------
describe('classifyBBTB', () => {
  it('16. Z < -3 → gizi_buruk', () => {
    expect(classifyBBTB(-3.5, false)).toBe('gizi_buruk')
  })

  it('17. -3 ≤ Z < -2 → gizi_kurang', () => {
    expect(classifyBBTB(-2.5, false)).toBe('gizi_kurang')
  })

  it('18. -2 ≤ Z ≤ 2 → gizi_baik', () => {
    expect(classifyBBTB(0, false)).toBe('gizi_baik')
  })

  it('19. 2 < Z ≤ 3 → gizi_lebih', () => {
    expect(classifyBBTB(2.5, false)).toBe('gizi_lebih')
    expect(classifyBBTB(3, false)).toBe('gizi_lebih')
  })

  it('20. Z > 3 → obesitas', () => {
    expect(classifyBBTB(3.5, false)).toBe('obesitas')
  })

  it('21. Edema → always gizi_buruk', () => {
    expect(classifyBBTB(0, true)).toBe('gizi_buruk')
    expect(classifyBBTB(3.5, true)).toBe('gizi_buruk')
  })
})

// ---------------------------------------------------------------------------
// Combined classifyAll
// ---------------------------------------------------------------------------
describe('classifyAll', () => {
  it('22. Normal boy at 12 months', () => {
    const result = classifyAll({
      weightKg: 9.6479, // median WFA for 12mo boy
      heightCm: 75.7,   // approximately median LHFA for 12mo boy
      ageDays: 365,
      sex: 'L',
      hasEdema: false,
      measurementType: 'PB',
    })
    expect(result.bb_u).toBe('gizi_baik')
    expect(result.tb_u).toBe('normal')
    expect(result.zscore_bb_u).not.toBeNull()
    expect(Math.abs(result.zscore_bb_u!)).toBeLessThan(1)
  })

  it('23. Edema overrides BB/U and BB/TB to gizi_buruk', () => {
    const result = classifyAll({
      weightKg: 10.0,
      heightCm: 76.0,
      ageDays: 365,
      sex: 'L',
      hasEdema: true,
      measurementType: 'PB',
    })
    expect(result.bb_u).toBe('gizi_buruk')
    expect(result.bb_tb).toBe('gizi_buruk')
    // TB/U should not be affected by edema
    expect(result.tb_u).toBe('normal')
  })
})

// ---------------------------------------------------------------------------
// KBM Tests
// ---------------------------------------------------------------------------
describe('getKBM', () => {
  it('24. 0-3 months → 800g/month', () => {
    expect(getKBM(0)).toBe(800)
    expect(getKBM(60)).toBe(800)  // ~2 months
    expect(getKBM(91)).toBe(800)  // ~3 months
  })

  it('25. 4-6 months → 600g/month', () => {
    expect(getKBM(122)).toBe(600) // ~4 months
    expect(getKBM(182)).toBe(600) // ~6 months
  })

  it('26. 7-9 months → 400g/month', () => {
    expect(getKBM(213)).toBe(400) // ~7 months
  })

  it('27. 10-11 months → 300g/month', () => {
    expect(getKBM(305)).toBe(300) // ~10 months
  })

  it('28. 12-23 months → 200g/month', () => {
    expect(getKBM(365)).toBe(200) // 12 months
    expect(getKBM(700)).toBe(200) // ~23 months
  })

  it('29. 24-59 months → 150g/month', () => {
    expect(getKBM(730)).toBe(150) // 24 months
    expect(getKBM(1800)).toBe(150) // ~59 months
  })
})

// ---------------------------------------------------------------------------
// N/T Determination
// ---------------------------------------------------------------------------
describe('determineNT', () => {
  it('30. Returns O when no previous weight', () => {
    expect(determineNT(5000, null, 60)).toBe('O')
  })

  it('31. Returns N when gain ≥ KBM', () => {
    // 2-month child, KBM = 800g, gained 900g → N
    expect(determineNT(5900, 5000, 60)).toBe('N')
  })

  it('32. Returns T when gain < KBM', () => {
    // 2-month child, KBM = 800g, gained 500g → T
    expect(determineNT(5500, 5000, 60)).toBe('T')
  })

  it('33. Returns T when weight decreased', () => {
    expect(determineNT(4500, 5000, 60)).toBe('T')
  })

  it('34. Returns N when gain exactly equals KBM', () => {
    // 2-month child, KBM = 800g, gained exactly 800g → N
    expect(determineNT(5800, 5000, 60)).toBe('N')
  })
})

// ---------------------------------------------------------------------------
// BGM Check
// ---------------------------------------------------------------------------
describe('checkBGM', () => {
  it('35. Z < -3 → BGM = true', () => {
    expect(checkBGM(-3.5, false)).toBe(true)
  })

  it('36. Z = -3 → BGM = false (not strictly below)', () => {
    expect(checkBGM(-3, false)).toBe(false)
  })

  it('37. Z > -3 → BGM = false', () => {
    expect(checkBGM(-2, false)).toBe(false)
  })

  it('38. Edema → BGM = true regardless of Z', () => {
    expect(checkBGM(0, true)).toBe(true)
  })

  it('39. null Z-score → BGM = false (unless edema)', () => {
    expect(checkBGM(null, false)).toBe(false)
    expect(checkBGM(null, true)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2T Check
// ---------------------------------------------------------------------------
describe('check2T', () => {
  it('40. Two consecutive T → true', () => {
    expect(check2T(['N', 'T', 'T'])).toBe(true)
  })

  it('41. Last is N → false', () => {
    expect(check2T(['T', 'T', 'N'])).toBe(false)
  })

  it('42. Only one T → false', () => {
    expect(check2T(['N', 'N', 'T'])).toBe(false)
  })

  it('43. Less than 2 entries → false', () => {
    expect(check2T(['T'])).toBe(false)
    expect(check2T([])).toBe(false)
  })

  it('44. T then O then T → false (not consecutive)', () => {
    expect(check2T(['T', 'O', 'T'])).toBe(false)
  })
})
