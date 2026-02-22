import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'
import { classifyAll } from '@/lib/who/classify'
import { getKBM, determineNT, checkBGM } from '@/lib/who/kbm'
import { ageInDays } from '@/lib/utils/age'

/**
 * POST /api/measurements
 * Create a new measurement with server-side Z-score calculation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await request.json() as {
      child_id: string
      tanggal_pengukuran: string
      berat_badan_kg: number
      tinggi_badan_cm?: number | null
      tipe_pengukuran_tb?: 'PB' | 'TB'
      lingkar_kepala_cm?: number | null
      lila_cm?: number | null
      has_edema?: boolean
      vitamin_a?: boolean
      pmt?: boolean
      asi_eksklusif?: boolean | null
      keterangan?: string | null
    }

    const { child_id, tanggal_pengukuran, berat_badan_kg } = body

    if (!child_id || !tanggal_pengukuran || berat_badan_kg === undefined || berat_badan_kg === null) {
      return NextResponse.json(
        { error: 'ID anak, tanggal pengukuran, dan berat badan wajib diisi' },
        { status: 400 }
      )
    }

    // Validate weight range
    if (berat_badan_kg < 0.5 || berat_badan_kg > 30) {
      return NextResponse.json(
        { error: 'Berat badan tidak valid (0.5 - 30 kg)' },
        { status: 400 }
      )
    }

    // Fetch child data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: childData, error: childError } = await (supabase as any)
      .from('children')
      .select('tanggal_lahir, jenis_kelamin, posyandu_id')
      .eq('id', child_id)
      .single()

    if (childError || !childData) {
      return NextResponse.json({ error: 'Data anak tidak ditemukan' }, { status: 404 })
    }

    const child = childData as { tanggal_lahir: string; jenis_kelamin: 'L' | 'P'; posyandu_id: string }

    // Calculate age
    const ageDays = ageInDays(child.tanggal_lahir, tanggal_pengukuran)
    const ageMonths = Math.floor(ageDays / 30.4375)

    if (ageDays < 0) {
      return NextResponse.json(
        { error: 'Tanggal pengukuran tidak boleh sebelum tanggal lahir' },
        { status: 400 }
      )
    }

    if (ageDays > 1856) {
      return NextResponse.json(
        { error: 'Anak sudah melebihi usia 5 tahun (balita)' },
        { status: 400 }
      )
    }

    const hasEdema = body.has_edema ?? false
    const tipe = body.tipe_pengukuran_tb ?? 'PB'

    // Calculate Z-scores and classification
    let classification = null
    if (body.tinggi_badan_cm) {
      classification = classifyAll({
        weightKg: berat_badan_kg,
        heightCm: body.tinggi_badan_cm,
        ageDays,
        sex: child.jenis_kelamin,
        hasEdema,
        measurementType: tipe,
      })
    } else {
      // Weight-only classification (no height)
      const { classifyAll: ca } = await import('@/lib/who/classify')
      // We still need height for BB/TB, but can calculate BB/U
      const { calculateWFA } = await import('@/lib/who/zscore')
      const { classifyBBU } = await import('@/lib/who/classify')
      const zBBU = calculateWFA(berat_badan_kg, ageDays, child.jenis_kelamin)
      classification = {
        zscore_bb_u: zBBU,
        zscore_tb_u: null,
        zscore_bb_tb: null,
        bb_u: zBBU !== null ? classifyBBU(zBBU, hasEdema) : null,
        tb_u: null,
        bb_tb: null,
      }
    }

    // Fetch previous measurement (within last 90 days) for N/T calculation
    const prevDate = new Date(tanggal_pengukuran)
    prevDate.setDate(prevDate.getDate() - 90)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prevMeasurements } = await (supabase as any)
      .from('measurements')
      .select('berat_badan_kg, status_naik, tanggal_pengukuran')
      .eq('child_id', child_id)
      .lt('tanggal_pengukuran', tanggal_pengukuran)
      .gte('tanggal_pengukuran', prevDate.toISOString().split('T')[0])
      .order('tanggal_pengukuran', { ascending: false })
      .limit(2)

    const prevMeasList = (prevMeasurements ?? []) as Array<{
      berat_badan_kg: number | null
      status_naik: string | null
      tanggal_pengukuran: string
    }>

    const prevBB = prevMeasList[0]?.berat_badan_kg ?? null
    const prevBBGrams = prevBB !== null ? prevBB * 1000 : null
    const currentBBGrams = berat_badan_kg * 1000

    const statusNaik = determineNT(currentBBGrams, prevBBGrams, ageDays)
    const kbmGram = getKBM(ageDays)
    const kenaikanBBGram = prevBBGrams !== null ? currentBBGrams - prevBBGrams : null
    const isBGM = checkBGM(classification?.zscore_bb_u ?? null, hasEdema)

    // Check 2T: is this the 2nd consecutive T?
    const prevStatus = prevMeasList[0]?.status_naik
    const is2T = statusNaik === 'T' && prevStatus === 'T'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedData, error: insertError } = await (supabase as any)
      .from('measurements')
      .insert({
        child_id,
        tanggal_pengukuran,
        umur_bulan: ageMonths,
        berat_badan_kg,
        tinggi_badan_cm: body.tinggi_badan_cm ?? null,
        lingkar_kepala_cm: body.lingkar_kepala_cm ?? null,
        lila_cm: body.lila_cm ?? null,
        tipe_pengukuran_tb: tipe,
        has_edema: hasEdema,
        zscore_bb_u: classification?.zscore_bb_u ?? null,
        zscore_tb_u: classification?.zscore_tb_u ?? null,
        zscore_bb_tb: classification?.zscore_bb_tb ?? null,
        status_bb_u: classification?.bb_u ?? null,
        status_tb_u: classification?.tb_u ?? null,
        status_bb_tb: classification?.bb_tb ?? null,
        bb_bulan_lalu_kg: prevBB,
        kenaikan_bb_gram: kenaikanBBGram,
        kbm_gram: kbmGram,
        status_naik: statusNaik,
        is_bgm: isBGM,
        is_2t: is2T,
        vitamin_a: body.vitamin_a ?? false,
        pmt: body.pmt ?? false,
        asi_eksklusif: body.asi_eksklusif ?? null,
        keterangan: body.keterangan ?? null,
        source_type: 'manual',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/measurements error:', insertError)
      return NextResponse.json({ error: 'Gagal menyimpan data pengukuran' }, { status: 500 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'CREATE_MEASUREMENT',
      resourceType: 'measurement',
      resourceId: insertedData?.id,
      metadata: { child_id, posyandu_id: child.posyandu_id },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data: insertedData }, { status: 201 })
  } catch (err) {
    console.error('POST /api/measurements unexpected error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}

/**
 * GET /api/measurements
 * Returns measurements for a child.
 * Query param: child_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const childId = request.nextUrl.searchParams.get('child_id')
    if (!childId) {
      return NextResponse.json({ error: 'child_id wajib diisi' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('measurements')
      .select('*')
      .eq('child_id', childId)
      .order('tanggal_pengukuran', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data pengukuran' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/measurements error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
