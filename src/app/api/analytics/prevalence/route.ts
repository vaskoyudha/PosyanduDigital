import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPrevalence, getPrevalenceByPosyandu } from '@/lib/analytics/prevalence'

/**
 * GET /api/analytics/prevalence
 * Query params:
 *   scope=posyandu&id=X&bulan=YYYY-MM → { prevalence: PrevalenceData }
 *   scope=puskesmas&id=X&bulan=YYYY-MM → { posyandu_list: PrevalenceData[] }
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
    const scope = (searchParams.get('scope') ?? 'posyandu') as 'posyandu' | 'puskesmas'
    const id = searchParams.get('id') ?? (scope === 'posyandu' ? profileData.posyandu_id : profileData.puskesmas_id)
    const bulan = searchParams.get('bulan') ?? new Date().toISOString().slice(0, 7)

    if (!id) {
      return NextResponse.json({ error: 'id diperlukan' }, { status: 400 })
    }

    if (scope === 'puskesmas') {
      const posyandu_list = await getPrevalenceByPosyandu(supabase as any, id, bulan)
      return NextResponse.json({ posyandu_list })
    }

    const prevalence = await getPrevalence(supabase as any, 'posyandu', id, bulan)
    return NextResponse.json({ prevalence })
  } catch (err) {
    console.error('[api/analytics/prevalence]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
