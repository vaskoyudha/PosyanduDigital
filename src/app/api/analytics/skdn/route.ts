import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateSKDN, getSKDNTrend } from '@/lib/analytics/skdn'

/**
 * GET /api/analytics/skdn
 * Query params: posyandu_id, bulan (YYYY-MM), months (default 6)
 * Returns: { current: SKDNData, trend: SKDNData[] }
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
    const posyanduId = searchParams.get('posyandu_id') ?? profileData.posyandu_id
    const bulan = searchParams.get('bulan') ?? new Date().toISOString().slice(0, 7)
    const months = Math.min(parseInt(searchParams.get('months') ?? '6', 10), 12)

    if (!posyanduId) {
      return NextResponse.json({ error: 'posyandu_id diperlukan' }, { status: 400 })
    }

    const [current, trend] = await Promise.all([
      calculateSKDN(supabase as any, posyanduId, bulan),
      getSKDNTrend(supabase as any, posyanduId, months),
    ])

    return NextResponse.json({ current, trend })
  } catch (err) {
    console.error('[api/analytics/skdn]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
