/**
 * Alerts Analytics
 *
 * Detects at-risk children: BGM, 2T (tidak naik 2 bulan berturut-turut),
 * BB turun, and children not yet weighed this month.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'

export type AlertType = 'BGM' | '2T' | 'BB_TURUN' | 'TIDAK_DATANG'

export interface AlertChild {
  childId: string
  nama: string
  posyanduNama: string
  posyanduId: string
  usiaBulan: number
  alertType: AlertType
  bbTerakhir: number | null
  tanggalTerakhir: string | null
  hariBelumTimbang: number
}

/**
 * Get at-risk children for all posyandu in a puskesmas.
 * Looks at the most recent measurement per child.
 */
export async function getAlerts(
  supabase: SupabaseClient<any>,
  puskesmasId: string
): Promise<AlertChild[]> {
  // Get all posyandu for this puskesmas
  const { data: posyanduList } = await (supabase as any)
    .from('posyandu')
    .select('id, nama')
    .eq('puskesmas_id', puskesmasId)

  if (!posyanduList || posyanduList.length === 0) return []

  const posyanduMap: Record<string, string> = {}
  posyanduList.forEach((p: any) => { posyanduMap[p.id] = p.nama })
  const posyanduIds: string[] = posyanduList.map((p: any) => p.id)

  // Get all active children
  const { data: childrenData } = await (supabase as any)
    .from('children')
    .select('id, nama, posyandu_id, tanggal_lahir')
    .in('posyandu_id', posyanduIds)
    .eq('is_active', true)

  if (!childrenData || childrenData.length === 0) return []

  const childIds: string[] = childrenData.map((c: any) => c.id)
  const childMap: Record<string, any> = {}
  childrenData.forEach((c: any) => { childMap[c.id] = c })

  // Get the most recent measurement per child
  const { data: latestMeasurements } = await (supabase as any)
    .from('measurements')
    .select('child_id, tanggal_pengukuran, berat_badan_kg, umur_bulan, is_bgm, is_2t, status_naik')
    .in('child_id', childIds)
    .order('tanggal_pengukuran', { ascending: false })

  if (!latestMeasurements) return []

  // Build map: child_id → latest measurement
  const latestByChild: Record<string, any> = {}
  for (const m of latestMeasurements) {
    if (!latestByChild[m.child_id]) {
      latestByChild[m.child_id] = m
    }
  }

  const today = new Date()
  const alerts: AlertChild[] = []

  for (const child of childrenData) {
    const latest = latestByChild[child.id]
    const posyanduNama = posyanduMap[child.posyandu_id] ?? '-'

    // Calculate age in months
    const born = new Date(child.tanggal_lahir)
    const usiaBulan = Math.floor(
      (today.getTime() - born.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )

    // Skip children over 60 months
    if (usiaBulan > 60) continue

    const hariBelumTimbang = latest
      ? Math.floor((today.getTime() - new Date(latest.tanggal_pengukuran).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    const base = {
      childId: child.id,
      nama: child.nama,
      posyanduNama,
      posyanduId: child.posyandu_id,
      usiaBulan,
      bbTerakhir: latest?.berat_badan_kg ?? null,
      tanggalTerakhir: latest?.tanggal_pengukuran ?? null,
      hariBelumTimbang,
    }

    if (latest?.is_bgm) {
      alerts.push({ ...base, alertType: 'BGM' })
    } else if (latest?.is_2t) {
      alerts.push({ ...base, alertType: '2T' })
    } else if (latest?.status_naik === 'T') {
      alerts.push({ ...base, alertType: 'BB_TURUN' })
    } else if (hariBelumTimbang > 45) {
      // Not weighed in >45 days (more than 1.5 months)
      alerts.push({ ...base, alertType: 'TIDAK_DATANG' })
    }
  }

  // Sort: BGM first, then 2T, then BB_TURUN, then TIDAK_DATANG
  const priority: Record<AlertType, number> = { BGM: 0, '2T': 1, BB_TURUN: 2, TIDAK_DATANG: 3 }
  alerts.sort((a, b) => priority[a.alertType] - priority[b.alertType])

  return alerts
}

/**
 * Get children not yet weighed this month for a posyandu.
 */
export async function getBelumDitimbang(
  supabase: SupabaseClient<any>,
  posyanduId: string,
  bulan: string  // YYYY-MM
): Promise<AlertChild[]> {
  const monthStart = `${bulan}-01`
  const [year, month] = bulan.split('-').map(Number)
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  // Get posyandu name
  const { data: posyandu } = await (supabase as any)
    .from('posyandu')
    .select('nama')
    .eq('id', posyanduId)
    .maybeSingle()
  const posyanduNama: string = posyandu?.nama ?? '-'

  // Get all active children
  const { data: childrenData } = await (supabase as any)
    .from('children')
    .select('id, nama, tanggal_lahir')
    .eq('posyandu_id', posyanduId)
    .eq('is_active', true)

  if (!childrenData || childrenData.length === 0) return []

  const childIds: string[] = childrenData.map((c: any) => c.id)

  // Get children who WERE weighed this month
  const { data: weighedThisMonth } = await (supabase as any)
    .from('measurements')
    .select('child_id, tanggal_pengukuran, berat_badan_kg')
    .gte('tanggal_pengukuran', monthStart)
    .lt('tanggal_pengukuran', nextMonth)
    .in('child_id', childIds)

  const weighedIds = new Set((weighedThisMonth ?? []).map((m: any) => m.child_id))

  // Get latest measurement for unweighed children
  const unweighedIds = childIds.filter(id => !weighedIds.has(id))
  if (unweighedIds.length === 0) return []

  const { data: latestMeasurements } = await (supabase as any)
    .from('measurements')
    .select('child_id, tanggal_pengukuran, berat_badan_kg')
    .in('child_id', unweighedIds)
    .order('tanggal_pengukuran', { ascending: false })

  const latestByChild: Record<string, any> = {}
  for (const m of latestMeasurements ?? []) {
    if (!latestByChild[m.child_id]) latestByChild[m.child_id] = m
  }

  const today = new Date()
  const result: AlertChild[] = []

  for (const child of childrenData) {
    if (weighedIds.has(child.id)) continue

    const born = new Date(child.tanggal_lahir)
    const usiaBulan = Math.floor(
      (today.getTime() - born.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
    if (usiaBulan > 60) continue

    const latest = latestByChild[child.id]
    const hariBelumTimbang = latest
      ? Math.floor((today.getTime() - new Date(latest.tanggal_pengukuran).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    result.push({
      childId: child.id,
      nama: child.nama,
      posyanduNama,
      posyanduId,
      usiaBulan,
      alertType: 'TIDAK_DATANG',
      bbTerakhir: latest?.berat_badan_kg ?? null,
      tanggalTerakhir: latest?.tanggal_pengukuran ?? null,
      hariBelumTimbang,
    })
  }

  return result
}
