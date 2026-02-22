/**
 * Prevalence Analytics
 *
 * Calculates nutrition prevalence (stunting, wasting, underweight, overweight)
 * from measurements for a given scope (posyandu or puskesmas).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PrevalenceData {
  scope: 'posyandu' | 'puskesmas'
  scopeId: string
  scopeName?: string
  stunting_pct: number       // TB/U: pendek + sangat_pendek
  wasting_pct: number        // BB/TB: gizi_buruk + gizi_kurang
  underweight_pct: number    // BB/U: gizi_buruk + gizi_kurang
  overweight_pct: number     // BB/U: gizi_lebih
  stunting_count: number
  wasting_count: number
  underweight_count: number
  overweight_count: number
  total_measured: number
  period: string             // YYYY-MM
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

/**
 * Get current prevalence for a posyandu or puskesmas scope.
 * Uses the latest measurement per child in the given month.
 */
export async function getPrevalence(
  supabase: SupabaseClient<any>,
  scope: 'posyandu' | 'puskesmas',
  scopeId: string,
  bulan: string  // YYYY-MM
): Promise<PrevalenceData> {
  const monthStart = `${bulan}-01`
  const [year, month] = bulan.split('-').map(Number)
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  let childIds: string[] = []

  if (scope === 'posyandu') {
    const { data } = await (supabase as any)
      .from('children')
      .select('id')
      .eq('posyandu_id', scopeId)
      .eq('is_active', true)
    childIds = (data ?? []).map((c: any) => c.id)
  } else {
    // puskesmas — get all posyandu IDs, then all children
    const { data: posyanduList } = await (supabase as any)
      .from('posyandu')
      .select('id')
      .eq('puskesmas_id', scopeId)
    const posyanduIds: string[] = (posyanduList ?? []).map((p: any) => p.id)

    if (posyanduIds.length > 0) {
      const { data } = await (supabase as any)
        .from('children')
        .select('id')
        .in('posyandu_id', posyanduIds)
        .eq('is_active', true)
      childIds = (data ?? []).map((c: any) => c.id)
    }
  }

  if (childIds.length === 0) {
    return emptyPrevalence(scope, scopeId, bulan)
  }

  // Get measurements in this month
  const { data: measurements } = await (supabase as any)
    .from('measurements')
    .select('child_id, status_tb_u, status_bb_tb, status_bb_u')
    .gte('tanggal_pengukuran', monthStart)
    .lt('tanggal_pengukuran', nextMonth)
    .in('child_id', childIds)

  const measured: any[] = measurements ?? []
  const total = measured.length

  if (total === 0) {
    return emptyPrevalence(scope, scopeId, bulan)
  }

  // Stunting: TB/U = pendek or sangat_pendek
  const stunting_count = measured.filter(
    (m: any) => m.status_tb_u === 'pendek' || m.status_tb_u === 'sangat_pendek'
  ).length

  // Wasting: BB/TB = gizi_buruk or gizi_kurang
  const wasting_count = measured.filter(
    (m: any) => m.status_bb_tb === 'gizi_buruk' || m.status_bb_tb === 'gizi_kurang'
  ).length

  // Underweight: BB/U = gizi_buruk or gizi_kurang
  const underweight_count = measured.filter(
    (m: any) => m.status_bb_u === 'gizi_buruk' || m.status_bb_u === 'gizi_kurang'
  ).length

  // Overweight: BB/U = gizi_lebih
  const overweight_count = measured.filter(
    (m: any) => m.status_bb_u === 'gizi_lebih'
  ).length

  return {
    scope,
    scopeId,
    stunting_pct: round1((stunting_count / total) * 100),
    wasting_pct: round1((wasting_count / total) * 100),
    underweight_pct: round1((underweight_count / total) * 100),
    overweight_pct: round1((overweight_count / total) * 100),
    stunting_count,
    wasting_count,
    underweight_count,
    overweight_count,
    total_measured: total,
    period: bulan,
  }
}

/**
 * Get prevalence per posyandu for a puskesmas (for comparison table).
 */
export async function getPrevalenceByPosyandu(
  supabase: SupabaseClient<any>,
  puskesmasId: string,
  bulan: string
): Promise<PrevalenceData[]> {
  const { data: posyanduList } = await (supabase as any)
    .from('posyandu')
    .select('id, nama')
    .eq('puskesmas_id', puskesmasId)

  if (!posyanduList || posyanduList.length === 0) return []

  const results = await Promise.all(
    posyanduList.map(async (p: any) => {
      const data = await getPrevalence(supabase, 'posyandu', p.id, bulan)
      return { ...data, scopeName: p.nama }
    })
  )

  return results
}

function emptyPrevalence(
  scope: 'posyandu' | 'puskesmas',
  scopeId: string,
  period: string
): PrevalenceData {
  return {
    scope,
    scopeId,
    stunting_pct: 0,
    wasting_pct: 0,
    underweight_pct: 0,
    overweight_pct: 0,
    stunting_count: 0,
    wasting_count: 0,
    underweight_count: 0,
    overweight_count: 0,
    total_measured: 0,
    period,
  }
}
