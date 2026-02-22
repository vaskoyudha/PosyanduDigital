import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAlerts, getBelumDitimbang } from '@/lib/analytics/alerts'

/**
 * GET /api/analytics/alerts
 * Query params:
 *   puskesmas_id=X → { alerts: AlertChild[], belum_ditimbang_count: number }
 *   posyandu_id=X&bulan=YYYY-MM → { belum_ditimbang: AlertChild[] }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profileData } = await (supabase as any)
      .from('user_profiles')
      .select('role, posyandu_id, puskesmas_id')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const puskesmasId = searchParams.get('puskesmas_id') ?? profileData.puskesmas_id
    const posyanduId = searchParams.get('posyandu_id') ?? profileData.posyandu_id
    const bulan = searchParams.get('bulan') ?? new Date().toISOString().slice(0, 7)

    // If posyandu_id provided, return belum-ditimbang list
    if (searchParams.has('posyandu_id') || (!searchParams.has('puskesmas_id') && posyanduId && !puskesmasId)) {
      if (!posyanduId) {
        return NextResponse.json({ error: 'posyandu_id diperlukan' }, { status: 400 })
      }
      const belum_ditimbang = await getBelumDitimbang(supabase as any, posyanduId, bulan)
      return NextResponse.json({ belum_ditimbang })
    }

    if (!puskesmasId) {
      return NextResponse.json({ error: 'puskesmas_id diperlukan' }, { status: 400 })
    }

    const alerts = await getAlerts(supabase as any, puskesmasId)
    const belum_ditimbang_count = alerts.filter(a => a.alertType === 'TIDAK_DATANG').length

    return NextResponse.json({ alerts, belum_ditimbang_count })
  } catch (err) {
    console.error('[api/analytics/alerts]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
