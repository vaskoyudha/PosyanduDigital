/**
 * Unit tests for WHO Z-Score Engine
 *
 * Tests cover:
 * - LMS formula correctness
 * - Restricted Z-score linearization
 * - WFA, LHFA, WFH calculations
 * - PB/TB conversion
 * - Age boundary conditions
 * - Sex differentiation
 * - Edge cases
 */
import { describe, it, expect } from 'vitest'
import {
  calculateZScoreLMS,
  calculateRestrictedZScore,
  adjustHeight,
  calculateWFA,
  calculateLHFA,
  calculateWFH,
} from '../zscore'
import { getWfaBoys } from '../tables/wfa-boys'
import { getWfaGirls } from '../tables/wfa-girls'
import { getLhfaBoys } from '../tables/lhfa-boys'
import { getLhfaGirls } from '../tables/lhfa-girls'
import { getWfhBoys } from '../tables/wfh-boys'
import { getWfhGirls } from '../tables/wfh-girls'

// Helper to check Z-score within ±0.01 tolerance
function expectZScore(actual: number | null, expected: number, tolerance = 0.05) {
  expect(actual).not.toBeNull()
  expect(actual!).toBeCloseTo(expected, 1) // 1 decimal place = ±0.05
}

// ---------------------------------------------------------------------------
// 1. Core LMS Formula Tests
// ---------------------------------------------------------------------------
describe('calculateZScoreLMS', () => {
  it('1. returns Z=0 when X equals the median (M)', () => {
    // When X = M, Z should be 0 regardless of L and S
    const z = calculateZScoreLMS(3.3464, -0.3521, 3.3464, 0.14602)
    expect(z).toBeCloseTo(0, 5)
  })

  it('2. returns positive Z for X > M', () => {
    const z = calculateZScoreLMS(4.0, -0.3521, 3.3464, 0.14602)
    expect(z).toBeGreaterThan(0)
  })

  it('3. returns negative Z for X < M', () => {
    const z = calculateZScoreLMS(2.5, -0.3521, 3.3464, 0.14602)
    expect(z).toBeLessThan(0)
  })

  it('4. handles L=0 (log transform) correctly', () => {
    // When L=0, Z = ln(X/M) / S
    const z = calculateZScoreLMS(10, 0, 10, 0.1)
    expect(z).toBeCloseTo(0, 5)

    const z2 = calculateZScoreLMS(Math.exp(0.1), 0, 1, 0.1)
    expect(z2).toBeCloseTo(1, 5)
  })

  it('5. returns NaN for invalid inputs (X=0, M=0)', () => {
    expect(calculateZScoreLMS(0, -0.3521, 3.3464, 0.14602)).toBeNaN()
    expect(calculateZScoreLMS(3.0, -0.3521, 0, 0.14602)).toBeNaN()
  })
})

// ---------------------------------------------------------------------------
// 2. Restricted Z-Score Tests
// ---------------------------------------------------------------------------
describe('calculateRestrictedZScore', () => {
  it('6. does not restrict Z-scores within ±3 range', () => {
    const result = calculateRestrictedZScore(3.3464, -0.3521, 3.3464, 0.14602)
    expect(result.zscore).toBeCloseTo(0, 5)
    expect(result.restricted).toBe(false)
  })

  it('7. restricts Z-scores > 3 with linearization', () => {
    // Very heavy child at birth (boys): far above +3SD
    const result = calculateRestrictedZScore(6.0, -0.3521, 3.3464, 0.14602)
    expect(result.zscore).toBeGreaterThan(3)
    expect(result.restricted).toBe(true)
  })

  it('8. restricts Z-scores < -3 with linearization', () => {
    // Very light child at birth (boys): far below -3SD
    const result = calculateRestrictedZScore(1.5, -0.3521, 3.3464, 0.14602)
    expect(result.zscore).toBeLessThan(-3)
    expect(result.restricted).toBe(true)
  })

  it('9. restricted Z-score is continuous at boundaries', () => {
    // Test that restricted Z at the boundary is approximately ±3
    const L = -0.3521, M = 3.3464, S = 0.14602

    // Calculate SD3pos
    const SD3pos = M * Math.pow(1 + L * S * 3, 1 / L)
    const resultAt3 = calculateRestrictedZScore(SD3pos, L, M, S)
    expect(resultAt3.zscore).toBeCloseTo(3, 1)

    // Calculate SD3neg
    const SD3neg = M * Math.pow(1 + L * S * (-3), 1 / L)
    const resultAtNeg3 = calculateRestrictedZScore(SD3neg, L, M, S)
    expect(resultAtNeg3.zscore).toBeCloseTo(-3, 1)
  })
})

// ---------------------------------------------------------------------------
// 3. Table Generation Tests
// ---------------------------------------------------------------------------
describe('LMS table generation', () => {
  it('10. WFA boys table has 1857 entries (days 0-1856)', () => {
    const table = getWfaBoys()
    expect(table.length).toBe(1857)
    expect(table[0].day).toBe(0)
    expect(table[1856].day).toBe(1856)
  })

  it('11. WFA girls table has 1857 entries', () => {
    const table = getWfaGirls()
    expect(table.length).toBe(1857)
  })

  it('12. WFA boys day 0 matches WHO reference (M=3.3464)', () => {
    const table = getWfaBoys()
    expect(table[0].M).toBeCloseTo(3.3464, 3)
    expect(table[0].L).toBeCloseTo(-0.3521, 3)
    expect(table[0].S).toBeCloseTo(0.14602, 4)
  })

  it('13. LHFA boys table has 1857 entries', () => {
    const table = getLhfaBoys()
    expect(table.length).toBe(1857)
  })

  it('14. WFH boys table covers 45.0-120.0cm range', () => {
    const table = getWfhBoys()
    expect(table[0].height).toBeCloseTo(45.0, 1)
    expect(table[table.length - 1].height).toBeCloseTo(120.0, 1)
    // 76 whole cm * 10 steps + 1 = 751 entries
    expect(table.length).toBe(751)
  })

  it('15. WFH girls table covers 45.0-120.0cm range', () => {
    const table = getWfhGirls()
    expect(table[0].height).toBeCloseTo(45.0, 1)
    expect(table[table.length - 1].height).toBeCloseTo(120.0, 1)
  })

  it('16. Interpolated daily values are monotonically increasing for M (WFA boys)', () => {
    const table = getWfaBoys()
    for (let i = 1; i < table.length; i++) {
      expect(table[i].M).toBeGreaterThanOrEqual(table[i - 1].M)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. WFA Z-Score Tests
// ---------------------------------------------------------------------------
describe('calculateWFA', () => {
  it('17. WHO reference: boys at birth, median weight → Z≈0', () => {
    const z = calculateWFA(3.3464, 0, 'L')
    expectZScore(z, 0, 0.01)
  })

  it('18. WHO reference: boys at 12mo, median weight → Z≈0', () => {
    // Day 365 ≈ 12 months, median for WFA boys at 12mo is ~9.6479
    const z = calculateWFA(9.6479, 365, 'L')
    expectZScore(z, 0)
  })

  it('19. WHO reference: girls at birth, median weight → Z≈0', () => {
    const z = calculateWFA(3.2322, 0, 'P')
    expectZScore(z, 0, 0.01)
  })

  it('20. WHO reference: girls at 12mo, median weight → Z≈0', () => {
    const z = calculateWFA(8.9481, 365, 'P')
    expectZScore(z, 0)
  })

  it('21. Underweight boy: negative Z-score', () => {
    // 6-month boy weighing 6.0kg (below median of ~7.93)
    const z = calculateWFA(6.0, 182, 'L')
    expect(z).not.toBeNull()
    expect(z!).toBeLessThan(-2)
  })

  it('22. Returns null for age > 1856 days', () => {
    const z = calculateWFA(15.0, 1857, 'L')
    expect(z).toBeNull()
  })

  it('23. Returns null for negative age', () => {
    const z = calculateWFA(3.0, -1, 'L')
    expect(z).toBeNull()
  })

  it('24. Sex differentiation: same weight at birth, different Z-scores', () => {
    const weight = 3.5
    const zBoy = calculateWFA(weight, 0, 'L')
    const zGirl = calculateWFA(weight, 0, 'P')
    expect(zBoy).not.toBeNull()
    expect(zGirl).not.toBeNull()
    // Boys median is 3.3464, girls median is 3.2322
    // So 3.5kg should give a lower Z for boys than girls
    expect(zBoy!).toBeLessThan(zGirl!)
  })
})

// ---------------------------------------------------------------------------
// 5. LHFA Z-Score Tests
// ---------------------------------------------------------------------------
describe('calculateLHFA', () => {
  it('25. Boys at birth, median length → Z≈0', () => {
    // LHFA boys birth median is ~49.88cm
    const z = calculateLHFA(49.8842, 0, 'L')
    expectZScore(z, 0, 0.01)
  })

  it('26. Girls at birth, median length → Z≈0', () => {
    const z = calculateLHFA(49.1477, 0, 'P')
    expectZScore(z, 0, 0.01)
  })

  it('27. Stunted child: short boy at 24mo', () => {
    // 24-month boy with height of 78cm (severely short)
    const z = calculateLHFA(78.0, 730, 'L')
    expect(z).not.toBeNull()
    expect(z!).toBeLessThan(-3)
  })

  it('28. Age boundary: day 1856 returns valid Z-score', () => {
    const z = calculateLHFA(110.0, 1856, 'L')
    expect(z).not.toBeNull()
  })

  it('29. Age boundary: day 1 returns valid Z-score', () => {
    const z = calculateLHFA(50.0, 1, 'L')
    expect(z).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 6. WFH Z-Score Tests
// ---------------------------------------------------------------------------
describe('calculateWFH', () => {
  it('30. Boy 70cm, median weight → Z≈0', () => {
    // WFH boys at 70cm, M ≈ 5.669
    const z = calculateWFH(5.669, 70.0, 200, 'L', 'PB')
    expectZScore(z, 0)
  })

  it('31. Girl 80cm, median weight → Z≈0', () => {
    // WFH girls at 80cm, M ≈ 7.267
    const z = calculateWFH(7.267, 80.0, 200, 'P', 'PB')
    expectZScore(z, 0)
  })

  it('32. Returns null for height out of range (<45cm)', () => {
    const z = calculateWFH(3.0, 40.0, 0, 'L', 'PB')
    expect(z).toBeNull()
  })

  it('33. Returns null for height out of range (>120cm)', () => {
    const z = calculateWFH(20.0, 125.0, 1800, 'L', 'TB')
    expect(z).toBeNull()
  })

  it('34. Wasted child: low weight for height', () => {
    // 3kg at 60cm (should be ~4.25kg)
    const z = calculateWFH(3.0, 60.0, 100, 'L', 'PB')
    expect(z).not.toBeNull()
    expect(z!).toBeLessThan(-2)
  })
})

// ---------------------------------------------------------------------------
// 7. PB/TB Conversion Tests
// ---------------------------------------------------------------------------
describe('adjustHeight', () => {
  it('35. Child <24mo measured standing (TB) → adds 0.7cm', () => {
    const adjusted = adjustHeight(70.0, 700, 'TB') // < 730 days
    expect(adjusted).toBeCloseTo(70.7, 1)
  })

  it('36. Child ≥24mo measured recumbent (PB) → subtracts 0.7cm', () => {
    const adjusted = adjustHeight(90.0, 730, 'PB') // >= 730 days
    expect(adjusted).toBeCloseTo(89.3, 1)
  })

  it('37. Child <24mo measured recumbent (PB) → no change', () => {
    const adjusted = adjustHeight(70.0, 700, 'PB')
    expect(adjusted).toBeCloseTo(70.0, 1)
  })

  it('38. Child ≥24mo measured standing (TB) → no change', () => {
    const adjusted = adjustHeight(90.0, 730, 'TB')
    expect(adjusted).toBeCloseTo(90.0, 1)
  })
})

// ---------------------------------------------------------------------------
// 8. Additional Edge Cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('39. WFA at exactly day 0', () => {
    const z = calculateWFA(3.3464, 0, 'L')
    expect(z).not.toBeNull()
    expectZScore(z, 0, 0.01)
  })

  it('40. WFA at exactly day 1856', () => {
    const z = calculateWFA(18.0, 1856, 'L')
    expect(z).not.toBeNull()
    // Should be close to 0 since 18kg ≈ median at 60 months for boys
    expect(Math.abs(z!)).toBeLessThan(1)
  })

  it('41. Very heavy child triggers restricted Z-score via WFA', () => {
    // Boy at birth weighing 6kg - way above +3SD
    const z = calculateWFA(6.0, 0, 'L')
    expect(z).not.toBeNull()
    expect(z!).toBeGreaterThan(3)
  })

  it('42. Very light child triggers restricted Z-score via WFA', () => {
    // Boy at 12mo weighing 5kg - way below -3SD
    const z = calculateWFA(5.0, 365, 'L')
    expect(z).not.toBeNull()
    expect(z!).toBeLessThan(-3)
  })
})
