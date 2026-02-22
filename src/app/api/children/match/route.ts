import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeCompositeScore, type MatchCandidate } from '@/lib/matching'
import { MATCH_THRESHOLD_AUTO, MATCH_THRESHOLD_REVIEW } from '@/lib/utils/constants'

/**
 * POST /api/children/match
 *
 * Find potential duplicate children within a posyandu.
 * Returns candidates with composite score >= MATCH_THRESHOLD_REVIEW (0.80).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await request.json() as {
      nama?: string
      tanggal_lahir?: string
      nama_ibu?: string
      nik?: string
      posyandu_id?: string
    }

    const { nama, tanggal_lahir, posyandu_id } = body

    if (!nama || !tanggal_lahir || !posyandu_id) {
      return NextResponse.json(
        { error: 'nama, tanggal_lahir, dan posyandu_id wajib diisi' },
        { status: 400 }
      )
    }

    // Verify user has access to this posyandu
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, posyandu_id, puskesmas_id')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 })
    }

    const profile = profileData as {
      role: string
      posyandu_id: string | null
      puskesmas_id: string | null
    }

    // Scope check: kader/bidan/tpg can only match within their own posyandu
    const scopedRoles = ['kader', 'bidan', 'tpg']
    if (scopedRoles.includes(profile.role)) {
      if (profile.posyandu_id !== posyandu_id) {
        return NextResponse.json(
          { error: 'Akses ditolak: posyandu tidak sesuai' },
          { status: 403 }
        )
      }
    }

    // Query active children from the target posyandu
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: children, error: queryError } = await (supabase as any)
      .from('children')
      .select('id, nama, tanggal_lahir, nama_ibu, nik')
      .eq('posyandu_id', posyandu_id)
      .eq('is_active', true)

    if (queryError) {
      console.error('POST /api/children/match query error:', queryError)
      return NextResponse.json({ error: 'Gagal mengambil data anak' }, { status: 500 })
    }

    const candidates: MatchCandidate[] = ((children ?? []) as Array<{
      id: string
      nama: string
      tanggal_lahir: string
      nama_ibu: string | null
      nik: string | null
    }>).map((c) => ({
      child_id: c.id,
      nama: c.nama,
      tanggal_lahir: c.tanggal_lahir,
      nama_ibu: c.nama_ibu,
      nik: c.nik,
    }))

    const query = {
      nama,
      tanggal_lahir,
      nama_ibu: body.nama_ibu,
      nik: body.nik,
    }

    // Score each candidate and filter by threshold
    const results = candidates
      .map((candidate) => computeCompositeScore(query, candidate))
      .filter((result) => result.score >= MATCH_THRESHOLD_REVIEW)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Enrich results with display data from candidates
    const candidateMap = new Map(candidates.map((c) => [c.child_id, c]))

    const matches = results.map((result) => {
      const candidate = candidateMap.get(result.child_id)
      return {
        child_id: result.child_id,
        nama: candidate?.nama ?? '',
        tanggal_lahir: candidate?.tanggal_lahir ?? '',
        nama_ibu: candidate?.nama_ibu ?? null,
        score: result.score,
        isNikMatch: result.isNikMatch,
        autoFlag: result.score >= MATCH_THRESHOLD_AUTO,
      }
    })

    return NextResponse.json({ matches })
  } catch (err) {
    console.error('POST /api/children/match unexpected error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
