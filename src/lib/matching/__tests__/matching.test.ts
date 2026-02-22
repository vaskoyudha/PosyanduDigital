import { describe, it, expect } from 'vitest'
import { normalizeName } from '../normalize'
import { jaroSimilarity, jaroWinklerSimilarity } from '../jaro-winkler'
import { computeCompositeScore, type MatchCandidate } from '../composite-score'

// ============================================================
// normalizeName tests
// ============================================================
describe('normalizeName', () => {
  it('should lowercase and trim', () => {
    expect(normalizeName('  SITI  ')).toBe('siti')
  })

  it('should strip honorific title "dr." at start', () => {
    expect(normalizeName('dr. Ahmad')).toBe('ahmad')
  })

  it('should strip honorific title "hj." at start', () => {
    expect(normalizeName('Hj. Fatimah')).toBe('fatimah')
  })

  it('should strip honorific title "prof." at start', () => {
    expect(normalizeName('Prof. Budiono')).toBe('budiono')
  })

  it('should strip lineage particle "binti" and everything after', () => {
    expect(normalizeName('SITI AMINAH BINTI ISMAIL')).toBe('siti aminah')
  })

  it('should strip lineage particle "bin" and everything after', () => {
    expect(normalizeName('Ahmad bin Abdullah')).toBe('ahmad')
  })

  it('should unify Muhammad variant "Muh."', () => {
    expect(normalizeName('Muh. Rizki')).toBe('muhammad rizki')
  })

  it('should unify Muhammad variant "Mhd"', () => {
    expect(normalizeName('Mhd Fadli')).toBe('muhammad fadli')
  })

  it('should unify "mohamad" to "muhammad"', () => {
    expect(normalizeName('Mohamad Yusuf')).toBe('muhammad yusuf')
  })

  it('should convert old Dutch spelling "oe" to "u"', () => {
    expect(normalizeName('Soekarno')).toBe('sukarno')
  })

  it('should convert old Dutch spelling "dj" to "j"', () => {
    expect(normalizeName('Djoko')).toBe('joko')
  })

  it('should convert old Dutch spelling "tj" to "c"', () => {
    expect(normalizeName('Tjahjo')).toBe('cahjo')
  })

  it('should collapse multiple spaces', () => {
    expect(normalizeName('Siti   Aminah   Rahayu')).toBe('siti aminah rahayu')
  })

  it('should handle empty string', () => {
    expect(normalizeName('')).toBe('')
  })

  it('should handle single name (common in Indonesian)', () => {
    expect(normalizeName('Suharto')).toBe('suharto')
  })
})

// ============================================================
// jaroSimilarity tests
// ============================================================
describe('jaroSimilarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(jaroSimilarity('hello', 'hello')).toBe(1.0)
  })

  it('should return 1.0 for two empty strings', () => {
    expect(jaroSimilarity('', '')).toBe(1.0)
  })

  it('should return 0.0 for empty vs non-empty', () => {
    expect(jaroSimilarity('', 'hello')).toBe(0.0)
    expect(jaroSimilarity('hello', '')).toBe(0.0)
  })

  it('should return correct value for MARTHA vs MARHTA', () => {
    const score = jaroSimilarity('MARTHA', 'MARHTA')
    // Expected: ~0.944
    expect(score).toBeCloseTo(0.9444, 3)
  })

  it('should handle single character strings', () => {
    expect(jaroSimilarity('a', 'a')).toBe(1.0)
    expect(jaroSimilarity('a', 'b')).toBe(0.0)
  })
})

// ============================================================
// jaroWinklerSimilarity tests
// ============================================================
describe('jaroWinklerSimilarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(jaroWinklerSimilarity('hello', 'hello')).toBe(1.0)
  })

  it('should return 1.0 for two empty strings', () => {
    expect(jaroWinklerSimilarity('', '')).toBe(1.0)
  })

  it('should return 0.0 for empty vs non-empty', () => {
    expect(jaroWinklerSimilarity('', 'hello')).toBe(0.0)
  })

  it('should boost score for common prefix (MARTHA vs MARHTA)', () => {
    const jaro = jaroSimilarity('MARTHA', 'MARHTA')
    const jw = jaroWinklerSimilarity('MARTHA', 'MARHTA')
    // Winkler should be >= Jaro (boosted by common prefix "MAR", l=3)
    expect(jw).toBeGreaterThanOrEqual(jaro)
    // jw = 0.9444 + 3 * 0.1 * (1 - 0.9444) = 0.9444 + 0.01667 ≈ 0.9611
    expect(jw).toBeCloseTo(0.9611, 3)
  })

  it('should produce high similarity for Rizki vs Rizky', () => {
    const score = jaroWinklerSimilarity('rizki', 'rizky')
    // rizki vs rizky: jaro ~0.8667, prefix "rizk" (l=4)
    // jw = 0.8667 + 4 * 0.1 * (1 - 0.8667) ≈ 0.92
    expect(score).toBeGreaterThan(0.89)
  })

  it('should produce moderate similarity for partial name match', () => {
    const score = jaroWinklerSimilarity('aminah', 'siti aminah')
    // Partial names should be moderate, not very high
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.85)
  })

  it('should return score <= 1.0 even with high prefix match', () => {
    const score = jaroWinklerSimilarity('abcdef', 'abcxyz')
    expect(score).toBeLessThanOrEqual(1.0)
  })
})

// ============================================================
// computeCompositeScore tests
// ============================================================
describe('computeCompositeScore', () => {
  const makeCandidate = (
    overrides: Partial<MatchCandidate> = {}
  ): MatchCandidate => ({
    child_id: 'child-001',
    nama: 'Muhammad Rizki',
    tanggal_lahir: '2023-06-15',
    nama_ibu: 'Siti Aminah',
    nik: null,
    ...overrides,
  })

  it('should return high score for same name, same DOB, same mother', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-06-15', nama_ibu: 'Siti Aminah' },
      makeCandidate()
    )
    // Name: 1.0, DOB: 1.0, Mother: 1.0 → composite = 1.0
    expect(result.score).toBeCloseTo(1.0, 1)
    expect(result.isNikMatch).toBe(false)
  })

  it('should return high score for Muhammad variant + same DOB', () => {
    const result = computeCompositeScore(
      { nama: 'Muh. Rizki', tanggal_lahir: '2023-06-15', nama_ibu: 'Siti Aminah' },
      makeCandidate({ nama: 'Muhammad Rizky' })
    )
    // After normalization: "muhammad rizki" vs "muhammad rizky" → high JW
    // DOB exact match: 1.0, Mother exact match: 1.0
    expect(result.score).toBeGreaterThanOrEqual(0.85)
  })

  it('should return lower score when DOB differs by 5 months', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-01-15', nama_ibu: 'Siti Aminah' },
      makeCandidate({ tanggal_lahir: '2023-06-15' })
    )
    // DOB: same year but > 30 days apart → 0.0
    expect(result.dobScore).toBe(0.0)
    expect(result.score).toBeLessThan(0.80)
  })

  it('should return score 1.0 for NIK exact match', () => {
    const result = computeCompositeScore(
      { nama: 'Different Name', tanggal_lahir: '2020-01-01', nik: '3201234567890001' },
      makeCandidate({ nik: '3201234567890001' })
    )
    expect(result.score).toBe(1.0)
    expect(result.isNikMatch).toBe(true)
  })

  it('should return score 0.0 for NIK mismatch', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-06-15', nik: '3201234567890001' },
      makeCandidate({ nik: '3201234567890002' })
    )
    expect(result.score).toBe(0.0)
    expect(result.isNikMatch).toBe(false)
  })

  it('should use neutral mother score (0.5) when mother name is missing', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-06-15' },
      makeCandidate({ nama_ibu: null })
    )
    expect(result.motherScore).toBe(0.5)
  })

  it('should handle DOB within 30 days (same year) as close match', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-06-20', nama_ibu: 'Siti Aminah' },
      makeCandidate({ tanggal_lahir: '2023-06-15' })
    )
    // 5 days apart, same year → 0.6
    expect(result.dobScore).toBe(0.6)
  })

  it('should return low score for completely different names', () => {
    const result = computeCompositeScore(
      { nama: 'Budi Santoso', tanggal_lahir: '2020-01-01', nama_ibu: 'Wati' },
      makeCandidate({ nama: 'Rina Kusuma', tanggal_lahir: '2022-12-31', nama_ibu: 'Dewi' })
    )
    expect(result.score).toBeLessThan(0.5)
  })

  it('should skip NIK logic when only query has NIK', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-06-15', nik: '3201234567890001' },
      makeCandidate({ nik: null })
    )
    // Should fall through to composite scoring, not NIK shortcut
    expect(result.isNikMatch).toBe(false)
    expect(result.score).toBeGreaterThan(0)
  })

  it('should skip NIK logic when only candidate has NIK', () => {
    const result = computeCompositeScore(
      { nama: 'Muhammad Rizki', tanggal_lahir: '2023-06-15' },
      makeCandidate({ nik: '3201234567890001' })
    )
    expect(result.isNikMatch).toBe(false)
    expect(result.score).toBeGreaterThan(0)
  })
})
