import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'

/**
 * GET /api/children
 * Returns list of children for the current user's scope.
 * Query params: search, jenis_kelamin, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, posyandu_id, puskesmas_id')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 })
    }

    const profile = profileData as { role: string; posyandu_id: string | null; puskesmas_id: string | null }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') ?? ''
    const jenisKelamin = searchParams.get('jenis_kelamin') ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    // Build base query — cast to any to avoid Database generic hell
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseQuery = (supabase as any)
      .from('children')
      .select('id, nama, tanggal_lahir, jenis_kelamin, nik, nama_ibu, posyandu_id, is_active, created_at')
      .eq('is_active', true)
      .order('nama', { ascending: true })
      .range(offset, offset + limit - 1)

    // Scope by role
    const scopedRoles = ['kader', 'bidan', 'tpg']
    let scopedQuery = baseQuery
    if (scopedRoles.includes(profile.role)) {
      if (!profile.posyandu_id) {
        return NextResponse.json({ data: [] })
      }
      scopedQuery = scopedQuery.eq('posyandu_id', profile.posyandu_id)
    } else if (profile.role === 'kepala_puskesmas' && profile.puskesmas_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: posyandus } = await (supabase as any)
        .from('posyandu')
        .select('id')
        .eq('puskesmas_id', profile.puskesmas_id)
      const ids: string[] = (posyandus ?? []).map((p: { id: string }) => p.id)
      scopedQuery = scopedQuery.in(
        'posyandu_id',
        ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']
      )
    }
    // dinas/admin: no scope filter

    if (search.trim()) {
      scopedQuery = scopedQuery.ilike('nama', `%${search.trim()}%`)
    }

    if (jenisKelamin === 'L' || jenisKelamin === 'P') {
      scopedQuery = scopedQuery.eq('jenis_kelamin', jenisKelamin)
    }

    const { data, error } = await scopedQuery

    if (error) {
      console.error('GET /api/children error:', error)
      return NextResponse.json({ error: 'Gagal mengambil data anak' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/children unexpected error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}

/**
 * POST /api/children
 * Create a new child record.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, posyandu_id')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 })
    }

    const profile = profileData as { role: string; posyandu_id: string | null }

    const body = await request.json() as {
      nama: string
      jenis_kelamin: string
      tanggal_lahir: string
      nik?: string
      no_kk?: string
      nama_ibu?: string
      nama_ayah?: string
      alamat?: string
      rt?: string
      rw?: string
      berat_lahir_kg?: number | null
      panjang_lahir_cm?: number | null
      consent_given?: boolean
      consent_date?: string
      consent_guardian_name?: string
      consent_guardian_relationship?: string
      posyandu_id?: string
    }

    const { nama, jenis_kelamin, tanggal_lahir } = body

    if (!nama || !jenis_kelamin || !tanggal_lahir) {
      return NextResponse.json(
        { error: 'Nama, jenis kelamin, dan tanggal lahir wajib diisi' },
        { status: 400 }
      )
    }

    if (!['L', 'P'].includes(jenis_kelamin)) {
      return NextResponse.json({ error: 'Jenis kelamin tidak valid' }, { status: 400 })
    }

    const posyanduId = profile.posyandu_id ?? body.posyandu_id
    if (!posyanduId) {
      return NextResponse.json({ error: 'Posyandu tidak ditemukan' }, { status: 400 })
    }

    const toTitleCase = (s: string) =>
      s.trim().replace(/\b\w/g, (c) => c.toUpperCase())

    const normalizedName = toTitleCase(nama)
    const normalizedNamaIbu = body.nama_ibu ? toTitleCase(body.nama_ibu) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('children')
      .insert({
        nama: normalizedName,
        nama_normalized: normalizedName.toLowerCase(),
        jenis_kelamin: jenis_kelamin as 'L' | 'P',
        tanggal_lahir,
        nik: body.nik?.replace(/\D/g, '') || null,
        no_kk: body.no_kk?.replace(/\D/g, '') || null,
        nama_ibu: normalizedNamaIbu,
        nama_ibu_normalized: normalizedNamaIbu?.toLowerCase() ?? null,
        nama_ayah: body.nama_ayah?.trim() || null,
        alamat: body.alamat?.trim() || null,
        rt: body.rt?.trim() || null,
        rw: body.rw?.trim() || null,
        berat_lahir_kg: body.berat_lahir_kg ?? null,
        panjang_lahir_cm: body.panjang_lahir_cm ?? null,
        posyandu_id: posyanduId,
        is_active: true,
        consent_given: body.consent_given ?? false,
        consent_date: body.consent_given
          ? (body.consent_date ?? new Date().toISOString().split('T')[0])
          : null,
        consent_guardian_name: body.consent_given
          ? (body.consent_guardian_name?.trim() ?? null)
          : null,
        consent_guardian_relationship: body.consent_given
          ? (body.consent_guardian_relationship?.trim() ?? null)
          : null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/children error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal menyimpan data anak' }, { status: 500 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      userRole: profile.role,
      action: 'CREATE_CHILD',
      resourceType: 'child',
      resourceId: data?.id,
      metadata: { posyandu_id: posyanduId },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/children unexpected error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
