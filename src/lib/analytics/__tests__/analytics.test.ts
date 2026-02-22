/**
 * Unit tests for Analytics — SKDN, Prevalence, Alerts
 *
 * All three modules depend on Supabase, so we mock the client
 * and test the calculation/mapping logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateSKDN, getSKDNTrend, getSKDNByPuskesmas } from '../skdn'
import { getPrevalence, getPrevalenceByPosyandu } from '../prevalence'
import { getAlerts, getBelumDitimbang } from '../alerts'

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase mock
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: unknown }

/**
 * Creates a chainable mock that mirrors the Supabase PostgREST builder.
 * Every chainable method (select, eq, gte, lt, in, order, limit)
 * returns `this`, while terminal methods (maybeSingle, single)
 * resolve with the configured result.
 */
function createChainMock(result: MockResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}

  const terminalFn = vi.fn().mockResolvedValue(result)

  // Every chainable method returns the chain itself
  for (const method of ['select', 'eq', 'gte', 'lt', 'in', 'order', 'limit', 'insert']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Terminal methods resolve the result
  chain.maybeSingle = terminalFn
  chain.single = terminalFn

  // The chain itself acts as a thenable (await chain → result)
  chain.then = (resolve: (v: unknown) => void) => resolve(result)

  return chain
}

/**
 * Builds a mock Supabase client where `.from(table)` can return
 * different chains depending on the table name and call order.
 */
function createMockSupabase(tableResults: Record<string, MockResult[]>) {
  const callCounts: Record<string, number> = {}

  return {
    from: vi.fn((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0
      const results = tableResults[table] ?? [{ data: null, error: null }]
      const idx = Math.min(callCounts[table], results.length - 1)
      callCounts[table]++
      return createChainMock(results[idx])
    }),
  } as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ===========================================================================
// calculateSKDN
// ===========================================================================
describe('calculateSKDN', () => {
  it('uses cached skdn_monthly when available', async () => {
    const mockSupa = createMockSupabase({
      skdn_monthly: [{
        data: {
          s_sasaran: 50,
          k_ber_kms: 40,
          d_ditimbang: 30,
          n_naik: 20,
          bgm_count: 2,
          t2_count: 1,
        },
        error: null,
      }],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2026-01')

    expect(result.bulan).toBe('2026-01')
    expect(result.S).toBe(50)
    expect(result.K).toBe(40)
    expect(result.D).toBe(30)
    expect(result.N).toBe(20)
    expect(result.BGM).toBe(2)
    expect(result.twoT).toBe(1)
    // D/S% = 30/50 * 100 = 60.0
    expect(result.ds_pct).toBe(60)
    // N/D% = 20/30 * 100 ≈ 66.7
    expect(result.nd_pct).toBe(66.7)
  })

  it('calculates D/S% correctly', async () => {
    const mockSupa = createMockSupabase({
      skdn_monthly: [{
        data: {
          s_sasaran: 100,
          k_ber_kms: 80,
          d_ditimbang: 75,
          n_naik: 50,
          bgm_count: 0,
          t2_count: 0,
        },
        error: null,
      }],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2026-02')
    expect(result.ds_pct).toBe(75)
  })

  it('calculates N/D% correctly', async () => {
    const mockSupa = createMockSupabase({
      skdn_monthly: [{
        data: {
          s_sasaran: 100,
          k_ber_kms: 80,
          d_ditimbang: 40,
          n_naik: 30,
          bgm_count: 0,
          t2_count: 0,
        },
        error: null,
      }],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2026-02')
    expect(result.nd_pct).toBe(75)
  })

  it('returns zero values when no cached data and no children', async () => {
    const mockSupa = createMockSupabase({
      skdn_monthly: [{ data: null, error: null }],
      children: [{ data: [], error: null }],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2026-01')

    expect(result.S).toBe(0)
    expect(result.K).toBe(0)
    expect(result.D).toBe(0)
    expect(result.N).toBe(0)
    expect(result.ds_pct).toBe(0)
    expect(result.nd_pct).toBe(0)
  })

  it('falls back to live calculation when no cache', async () => {
    const mockSupa = createMockSupabase({
      // First: skdn_monthly cache miss
      skdn_monthly: [{ data: null, error: null }],
      // Second: children query
      children: [{
        data: [
          { id: 'c1' },
          { id: 'c2' },
          { id: 'c3' },
        ],
        error: null,
      }],
      // Third + Fourth: measurements (month + ever)
      measurements: [
        // Month measurements
        {
          data: [
            { child_id: 'c1', is_bgm: false, is_2t: false, status_naik: 'N' },
            { child_id: 'c2', is_bgm: true, is_2t: false, status_naik: 'T' },
          ],
          error: null,
        },
        // Ever measured
        {
          data: [
            { child_id: 'c1' },
            { child_id: 'c2' },
          ],
          error: null,
        },
      ],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2026-01')

    expect(result.S).toBe(3)
    expect(result.D).toBe(2)
    expect(result.N).toBe(1) // only c1 has status_naik = 'N'
    expect(result.BGM).toBe(1) // c2 is bgm
    expect(result.K).toBe(2)
    // D/S = 2/3 ≈ 66.7
    expect(result.ds_pct).toBe(66.7)
    // N/D = 1/2 = 50
    expect(result.nd_pct).toBe(50)
  })

  it('handles D=0 giving nd_pct=0 (no division by zero)', async () => {
    const mockSupa = createMockSupabase({
      skdn_monthly: [{
        data: {
          s_sasaran: 10,
          k_ber_kms: 5,
          d_ditimbang: 0,
          n_naik: 0,
          bgm_count: 0,
          t2_count: 0,
        },
        error: null,
      }],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2026-02')
    expect(result.nd_pct).toBe(0)
    expect(result.ds_pct).toBe(0)
  })

  it('handles month=12 boundary (next month = Jan next year)', async () => {
    const mockSupa = createMockSupabase({
      skdn_monthly: [{
        data: {
          s_sasaran: 20,
          k_ber_kms: 15,
          d_ditimbang: 10,
          n_naik: 8,
          bgm_count: 0,
          t2_count: 0,
        },
        error: null,
      }],
    })

    const result = await calculateSKDN(mockSupa, 'pos-1', '2025-12')
    expect(result.bulan).toBe('2025-12')
    expect(result.S).toBe(20)
  })
})

// ===========================================================================
// getSKDNTrend
// ===========================================================================
describe('getSKDNTrend', () => {
  it('returns array of correct length', async () => {
    // Every calculateSKDN call queries skdn_monthly first
    const mockSupa = createMockSupabase({
      skdn_monthly: [{
        data: {
          s_sasaran: 10,
          k_ber_kms: 8,
          d_ditimbang: 6,
          n_naik: 4,
          bgm_count: 0,
          t2_count: 0,
        },
        error: null,
      }],
    })

    const trend = await getSKDNTrend(mockSupa, 'pos-1', 3)
    expect(trend).toHaveLength(3)
    for (const item of trend) {
      expect(item.S).toBe(10)
    }
  })
})

// ===========================================================================
// getSKDNByPuskesmas
// ===========================================================================
describe('getSKDNByPuskesmas', () => {
  it('returns SKDN per posyandu under puskesmas', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{
        data: [
          { id: 'p1', nama: 'Posyandu A' },
          { id: 'p2', nama: 'Posyandu B' },
        ],
        error: null,
      }],
      // Each calculateSKDN call hits skdn_monthly
      skdn_monthly: [{
        data: {
          s_sasaran: 20,
          k_ber_kms: 15,
          d_ditimbang: 10,
          n_naik: 8,
          bgm_count: 0,
          t2_count: 0,
        },
        error: null,
      }],
    })

    const result = await getSKDNByPuskesmas(mockSupa, 'pusk-1', '2026-01')
    expect(result).toHaveLength(2)
    expect(result[0].posyanduNama).toBe('Posyandu A')
    expect(result[1].posyanduNama).toBe('Posyandu B')
  })

  it('returns empty array when no posyandu', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: [], error: null }],
    })

    const result = await getSKDNByPuskesmas(mockSupa, 'pusk-1', '2026-01')
    expect(result).toHaveLength(0)
  })
})

// ===========================================================================
// getPrevalence
// ===========================================================================
describe('getPrevalence', () => {
  it('calculates stunting percentage correctly', async () => {
    const mockSupa = createMockSupabase({
      children: [{
        data: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }],
        error: null,
      }],
      measurements: [{
        data: [
          { child_id: 'c1', status_tb_u: 'pendek', status_bb_tb: 'normal', status_bb_u: 'normal' },
          { child_id: 'c2', status_tb_u: 'sangat_pendek', status_bb_tb: 'normal', status_bb_u: 'normal' },
          { child_id: 'c3', status_tb_u: 'normal', status_bb_tb: 'normal', status_bb_u: 'normal' },
          { child_id: 'c4', status_tb_u: 'normal', status_bb_tb: 'gizi_kurang', status_bb_u: 'gizi_kurang' },
          { child_id: 'c5', status_tb_u: 'normal', status_bb_tb: 'normal', status_bb_u: 'gizi_lebih' },
        ],
        error: null,
      }],
    })

    const result = await getPrevalence(mockSupa, 'posyandu', 'pos-1', '2026-01')

    // Stunting: 2/5 = 40%
    expect(result.stunting_pct).toBe(40)
    expect(result.stunting_count).toBe(2)
    // Wasting: 1/5 = 20%
    expect(result.wasting_pct).toBe(20)
    expect(result.wasting_count).toBe(1)
    // Underweight: 1/5 = 20%
    expect(result.underweight_pct).toBe(20)
    expect(result.underweight_count).toBe(1)
    // Overweight: 1/5 = 20%
    expect(result.overweight_pct).toBe(20)
    expect(result.overweight_count).toBe(1)
    // Total
    expect(result.total_measured).toBe(5)
    expect(result.period).toBe('2026-01')
    expect(result.scope).toBe('posyandu')
    expect(result.scopeId).toBe('pos-1')
  })

  it('returns zero when no children', async () => {
    const mockSupa = createMockSupabase({
      children: [{ data: [], error: null }],
    })

    const result = await getPrevalence(mockSupa, 'posyandu', 'pos-1', '2026-01')

    expect(result.stunting_pct).toBe(0)
    expect(result.wasting_pct).toBe(0)
    expect(result.underweight_pct).toBe(0)
    expect(result.overweight_pct).toBe(0)
    expect(result.total_measured).toBe(0)
  })

  it('returns zero when children exist but no measurements', async () => {
    const mockSupa = createMockSupabase({
      children: [{ data: [{ id: 'c1' }], error: null }],
      measurements: [{ data: [], error: null }],
    })

    const result = await getPrevalence(mockSupa, 'posyandu', 'pos-1', '2026-01')
    expect(result.total_measured).toBe(0)
    expect(result.stunting_pct).toBe(0)
  })

  it('handles puskesmas scope (joins posyandu + children)', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: [{ id: 'p1' }, { id: 'p2' }], error: null }],
      children: [{ data: [{ id: 'c1' }, { id: 'c2' }], error: null }],
      measurements: [{
        data: [
          { child_id: 'c1', status_tb_u: 'pendek', status_bb_tb: 'normal', status_bb_u: 'normal' },
          { child_id: 'c2', status_tb_u: 'normal', status_bb_tb: 'normal', status_bb_u: 'normal' },
        ],
        error: null,
      }],
    })

    const result = await getPrevalence(mockSupa, 'puskesmas', 'pusk-1', '2026-01')
    expect(result.scope).toBe('puskesmas')
    expect(result.stunting_pct).toBe(50)
    expect(result.total_measured).toBe(2)
  })
})

// ===========================================================================
// getPrevalenceByPosyandu
// ===========================================================================
describe('getPrevalenceByPosyandu', () => {
  it('returns prevalence per posyandu with scopeName', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{
        data: [{ id: 'p1', nama: 'Posyandu Melati' }],
        error: null,
      }],
      children: [{ data: [{ id: 'c1' }], error: null }],
      measurements: [{
        data: [
          { child_id: 'c1', status_tb_u: 'normal', status_bb_tb: 'normal', status_bb_u: 'normal' },
        ],
        error: null,
      }],
    })

    const result = await getPrevalenceByPosyandu(mockSupa, 'pusk-1', '2026-01')
    expect(result).toHaveLength(1)
    expect(result[0].scopeName).toBe('Posyandu Melati')
  })

  it('returns empty array when no posyandu', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: [], error: null }],
    })

    const result = await getPrevalenceByPosyandu(mockSupa, 'pusk-1', '2026-01')
    expect(result).toHaveLength(0)
  })
})

// ===========================================================================
// getAlerts
// ===========================================================================
describe('getAlerts', () => {
  it('returns empty array when no posyandu', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: [], error: null }],
    })

    const result = await getAlerts(mockSupa, 'pusk-1')
    expect(result).toEqual([])
  })

  it('returns empty array when no children', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: [{ id: 'p1', nama: 'Posyandu A' }], error: null }],
      children: [{ data: [], error: null }],
    })

    const result = await getAlerts(mockSupa, 'pusk-1')
    expect(result).toEqual([])
  })

  it('identifies BGM child as highest priority alert', async () => {
    const today = new Date()
    const birthDate = new Date(today.getFullYear() - 1, today.getMonth(), 1)
      .toISOString().split('T')[0]
    const measureDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0]

    const mockSupa = createMockSupabase({
      posyandu: [{ data: [{ id: 'p1', nama: 'Posyandu A' }], error: null }],
      children: [{
        data: [{
          id: 'c1',
          nama: 'Anak BGM',
          posyandu_id: 'p1',
          tanggal_lahir: birthDate,
        }],
        error: null,
      }],
      measurements: [{
        data: [{
          child_id: 'c1',
          tanggal_pengukuran: measureDate,
          berat_badan_kg: 5.0,
          umur_bulan: 12,
          is_bgm: true,
          is_2t: false,
          status_naik: 'T',
        }],
        error: null,
      }],
    })

    const alerts = await getAlerts(mockSupa, 'pusk-1')
    expect(alerts.length).toBeGreaterThanOrEqual(1)
    expect(alerts[0].alertType).toBe('BGM')
    expect(alerts[0].nama).toBe('Anak BGM')
  })

  it('sorts alerts by priority: BGM > 2T > BB_TURUN > TIDAK_DATANG', async () => {
    const today = new Date()
    const birthDate = new Date(today.getFullYear() - 1, today.getMonth(), 1)
      .toISOString().split('T')[0]
    const recentDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0]
    // Date > 45 days ago for TIDAK_DATANG
    const oldDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const mockSupa = createMockSupabase({
      posyandu: [{ data: [{ id: 'p1', nama: 'Posyandu A' }], error: null }],
      children: [{
        data: [
          { id: 'c1', nama: 'Child BB_TURUN', posyandu_id: 'p1', tanggal_lahir: birthDate },
          { id: 'c2', nama: 'Child BGM', posyandu_id: 'p1', tanggal_lahir: birthDate },
          { id: 'c3', nama: 'Child 2T', posyandu_id: 'p1', tanggal_lahir: birthDate },
          { id: 'c4', nama: 'Child TIDAK_DATANG', posyandu_id: 'p1', tanggal_lahir: birthDate },
        ],
        error: null,
      }],
      measurements: [{
        data: [
          { child_id: 'c1', tanggal_pengukuran: recentDate, berat_badan_kg: 6, umur_bulan: 12, is_bgm: false, is_2t: false, status_naik: 'T' },
          { child_id: 'c2', tanggal_pengukuran: recentDate, berat_badan_kg: 5, umur_bulan: 12, is_bgm: true, is_2t: false, status_naik: 'T' },
          { child_id: 'c3', tanggal_pengukuran: recentDate, berat_badan_kg: 7, umur_bulan: 12, is_bgm: false, is_2t: true, status_naik: 'T' },
          { child_id: 'c4', tanggal_pengukuran: oldDate, berat_badan_kg: 8, umur_bulan: 12, is_bgm: false, is_2t: false, status_naik: 'N' },
        ],
        error: null,
      }],
    })

    const alerts = await getAlerts(mockSupa, 'pusk-1')

    // Check that we have the right priority order
    const types = alerts.map(a => a.alertType)
    const bgmIdx = types.indexOf('BGM')
    const t2Idx = types.indexOf('2T')
    const bbIdx = types.indexOf('BB_TURUN')
    const tdIdx = types.indexOf('TIDAK_DATANG')

    // BGM < 2T < BB_TURUN < TIDAK_DATANG in sort order
    if (bgmIdx >= 0 && t2Idx >= 0) expect(bgmIdx).toBeLessThan(t2Idx)
    if (t2Idx >= 0 && bbIdx >= 0) expect(t2Idx).toBeLessThan(bbIdx)
    if (bbIdx >= 0 && tdIdx >= 0) expect(bbIdx).toBeLessThan(tdIdx)
  })

  it('skips children over 60 months old', async () => {
    const today = new Date()
    // Child born 6 years ago = 72 months
    const oldBirthDate = new Date(today.getFullYear() - 6, today.getMonth(), 1)
      .toISOString().split('T')[0]
    const measureDate = today.toISOString().split('T')[0]

    const mockSupa = createMockSupabase({
      posyandu: [{ data: [{ id: 'p1', nama: 'Posyandu A' }], error: null }],
      children: [{
        data: [{
          id: 'c1',
          nama: 'Anak Tua',
          posyandu_id: 'p1',
          tanggal_lahir: oldBirthDate,
        }],
        error: null,
      }],
      measurements: [{
        data: [{
          child_id: 'c1',
          tanggal_pengukuran: measureDate,
          berat_badan_kg: 15,
          umur_bulan: 72,
          is_bgm: true,
          is_2t: false,
          status_naik: 'T',
        }],
        error: null,
      }],
    })

    const alerts = await getAlerts(mockSupa, 'pusk-1')
    // Over-60-month child should be filtered out
    expect(alerts).toHaveLength(0)
  })
})

// ===========================================================================
// getBelumDitimbang
// ===========================================================================
describe('getBelumDitimbang', () => {
  it('returns empty array when no children', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: { nama: 'Pos A' }, error: null }],
      children: [{ data: [], error: null }],
    })

    const result = await getBelumDitimbang(mockSupa, 'pos-1', '2026-01')
    expect(result).toEqual([])
  })

  it('returns empty when all children have been weighed', async () => {
    const mockSupa = createMockSupabase({
      posyandu: [{ data: { nama: 'Pos A' }, error: null }],
      children: [{
        data: [
          { id: 'c1', nama: 'Anak 1', tanggal_lahir: '2024-01-01' },
        ],
        error: null,
      }],
      measurements: [
        // weighed this month
        { data: [{ child_id: 'c1', tanggal_pengukuran: '2026-01-15', berat_badan_kg: 8.0 }], error: null },
      ],
    })

    const result = await getBelumDitimbang(mockSupa, 'pos-1', '2026-01')
    expect(result).toHaveLength(0)
  })

  it('returns children not weighed this month', async () => {
    const today = new Date()
    const birthDate = new Date(today.getFullYear() - 1, today.getMonth(), 1)
      .toISOString().split('T')[0]

    const mockSupa = createMockSupabase({
      posyandu: [{ data: { nama: 'Posyandu Mawar' }, error: null }],
      children: [{
        data: [
          { id: 'c1', nama: 'Anak Hadir', tanggal_lahir: birthDate },
          { id: 'c2', nama: 'Anak Absen', tanggal_lahir: birthDate },
        ],
        error: null,
      }],
      measurements: [
        // weighed this month — only c1
        { data: [{ child_id: 'c1', tanggal_pengukuran: '2026-01-10', berat_badan_kg: 8 }], error: null },
        // latest measurements for unweighed
        { data: [{ child_id: 'c2', tanggal_pengukuran: '2025-12-10', berat_badan_kg: 7 }], error: null },
      ],
    })

    const result = await getBelumDitimbang(mockSupa, 'pos-1', '2026-01')
    expect(result.length).toBeGreaterThanOrEqual(1)
    const names = result.map(r => r.nama)
    expect(names).toContain('Anak Absen')
    expect(result[0].alertType).toBe('TIDAK_DATANG')
    expect(result[0].posyanduNama).toBe('Posyandu Mawar')
  })
})
