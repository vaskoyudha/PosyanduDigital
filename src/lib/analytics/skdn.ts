/**
 * SKDN Analytics
 *
 * Calculates S/K/D/N metrics from measurements and skdn_monthly table.
 * SKDN = Sasaran / Ber-KMS / Ditimbang / Naik berat badan
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SKDNData {
  bulan: string      // YYYY-MM
  S: number          // sasaran – all active children registered at posyandu
  K: number          // ber-KMS – children with any measurement record
  D: number          // ditimbang – weighed this month
  N: number          // naik – weight increased vs previous month
  BGM: number        // bawah garis merah (is_bgm = true)
  twoT: number       // tidak naik 2× berturut-turut (is_2t = true)
  ds_pct: number     // D/S percentage (0–100)
  nd_pct: number     // N/D percentage (0–100)
}

/**
 * Calculate SKDN for a posyandu in a given month.
 * First tries skdn_monthly (pre-computed); falls back to live calculation.
 */
export async function calculateSKDN(
  supabase: SupabaseClient<any>,
  posyanduId: string,
  bulan: string  // YYYY-MM
): Promise<SKDNData> {
  const monthStart = `${bulan}-01`
  const [year, month] = bulan.split('-').map(Number)
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  // Try pre-computed first
  const { data: cached } = await (supabase as any)
    .from('skdn_monthly')
    .select('*')
    .eq('posyandu_id', posyanduId)
    .eq('bulan', monthStart)
    .maybeSingle()

  if (cached) {
    const S = cached.s_sasaran ?? 0
    const K = cached.k_ber_kms ?? 0
    const D = cached.d_ditimbang ?? 0
    const N = cached.n_naik ?? 0
    return {
      bulan,
      S,
      K,
      D,
      N,
      BGM: cached.bgm_count ?? 0,
      twoT: cached.t2_count ?? 0,
      ds_pct: S > 0 ? Math.round((D / S) * 1000) / 10 : 0,
      nd_pct: D > 0 ? Math.round((N / D) * 1000) / 10 : 0,
    }
  }

  // Live calculation — get all active child IDs for this posyandu
  const { data: childRows } = await (supabase as any)
    .from('children')
    .select('id')
    .eq('posyandu_id', posyanduId)
    .eq('is_active', true)

  const childIds: string[] = (childRows ?? []).map((c: any) => c.id)
  const S = childIds.length

  if (S === 0) {
    return { bulan, S: 0, K: 0, D: 0, N: 0, BGM: 0, twoT: 0, ds_pct: 0, nd_pct: 0 }
  }

  // D = weighed this month
  const { data: monthMeasurements } = await (supabase as any)
    .from('measurements')
    .select('child_id, is_bgm, is_2t, status_naik')
    .gte('tanggal_pengukuran', monthStart)
    .lt('tanggal_pengukuran', nextMonth)
    .in('child_id', childIds)

  const measurements: any[] = monthMeasurements ?? []
  const D = measurements.length
  const N = measurements.filter((m: any) => m.status_naik === 'N').length
  const BGM = measurements.filter((m: any) => m.is_bgm).length
  const twoT = measurements.filter((m: any) => m.is_2t).length

  // K = children who have ever been measured (any time)
  const { data: everMeasured } = await (supabase as any)
    .from('measurements')
    .select('child_id')
    .in('child_id', childIds)

  const uniqueMeasured = new Set((everMeasured ?? []).map((m: any) => m.child_id))
  const K = uniqueMeasured.size

  return {
    bulan,
    S,
    K,
    D,
    N,
    BGM,
    twoT,
    ds_pct: S > 0 ? Math.round((D / S) * 1000) / 10 : 0,
    nd_pct: D > 0 ? Math.round((N / D) * 1000) / 10 : 0,
  }
}

/**
 * Get N-month SKDN trend for a posyandu.
 */
export async function getSKDNTrend(
  supabase: SupabaseClient<any>,
  posyanduId: string,
  months: number = 6
): Promise<SKDNData[]> {
  const result: SKDNData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const bulan = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const data = await calculateSKDN(supabase, posyanduId, bulan)
    result.push(data)
  }

  return result
}

/**
 * Get SKDN for all posyandu under a puskesmas for a given month.
 */
export async function getSKDNByPuskesmas(
  supabase: SupabaseClient<any>,
  puskesmasId: string,
  bulan: string
): Promise<Array<SKDNData & { posyanduId: string; posyanduNama: string }>> {
  const { data: posyanduList } = await (supabase as any)
    .from('posyandu')
    .select('id, nama')
    .eq('puskesmas_id', puskesmasId)

  if (!posyanduList || posyanduList.length === 0) return []

  const results = await Promise.all(
    posyanduList.map(async (p: any) => {
      const skdn = await calculateSKDN(supabase, p.id, bulan)
      return { ...skdn, posyanduId: p.id, posyanduNama: p.nama }
    })
  )

  return results
}
