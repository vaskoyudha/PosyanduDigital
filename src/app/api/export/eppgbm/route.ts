/**
 * GET /api/export/eppgbm
 *
 * Export e-PPGBM Excel file for a posyandu + month.
 * Query params: posyandu_id, bulan (YYYY-MM)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'
import { generateEppgbmExcel } from '@/lib/export/generate-excel'
import { formatDateIndonesian } from '@/lib/utils/date'
import type { EppgbmDataDasar, EppgbmPemantauan } from '@/lib/export/eppgbm-template'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const posyanduId = searchParams.get('posyandu_id')
    const bulan = searchParams.get('bulan') // YYYY-MM

    if (!posyanduId || !bulan) {
      return NextResponse.json(
        { error: 'Parameter posyandu_id dan bulan wajib diisi' },
        { status: 400 }
      )
    }

    // Validate bulan format
    if (!/^\d{4}-\d{2}$/.test(bulan)) {
      return NextResponse.json({ error: 'Format bulan tidak valid (YYYY-MM)' }, { status: 400 })
    }

    // Get posyandu info
    const { data: posyandu } = await (supabase as any)
      .from('posyandu')
      .select('id, nama, puskesmas_id')
      .eq('id', posyanduId)
      .maybeSingle()

    if (!posyandu) {
      return NextResponse.json({ error: 'Posyandu tidak ditemukan' }, { status: 404 })
    }

    const posyanduNama: string = posyandu.nama ?? 'Posyandu'

    // Fetch all active children for this posyandu
    const { data: childrenData } = await (supabase as any)
      .from('children')
      .select('id, no_kk, nik, nama, tanggal_lahir, jenis_kelamin, anak_ke, berat_lahir_kg, panjang_lahir_cm, nik_ibu, nik_ayah, nama_ibu, alamat, posyandu_id')
      .eq('posyandu_id', posyanduId)
      .eq('is_active', true)
      .order('nama', { ascending: true })

    const children: any[] = childrenData ?? []
    const childIds: string[] = children.map((c: any) => c.id)

    // Map children to Data Dasar
    const dataDasar: EppgbmDataDasar[] = children.map((c: any) => ({
      no_kk: c.no_kk ?? null,
      nik_anak: c.nik ?? null,
      nama_anak: c.nama,
      tanggal_lahir: formatDateIndonesian(c.tanggal_lahir),
      jenis_kelamin: c.jenis_kelamin as 'L' | 'P',
      anak_ke: c.anak_ke ?? null,
      berat_lahir: c.berat_lahir_kg != null ? Number(c.berat_lahir_kg) : null,
      panjang_lahir: c.panjang_lahir_cm != null ? Number(c.panjang_lahir_cm) : null,
      nik_ibu: c.nik_ibu ?? null,
      nik_ayah: c.nik_ayah ?? null,
      nama_ibu: c.nama_ibu ?? null,
      alamat: c.alamat ?? null,
      posyandu_id: c.posyandu_id,
      puskesmas_id: posyandu.puskesmas_id ?? null,
    }))

    // Fetch measurements for this month
    const monthStart = `${bulan}-01`
    const [year, month] = bulan.split('-').map(Number)
    const nextMonth = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    let measurements: any[] = []
    if (childIds.length > 0) {
      const { data: measurementData } = await (supabase as any)
        .from('measurements')
        .select('child_id, tanggal_pengukuran, berat_badan_kg, tinggi_badan_cm, lingkar_kepala_cm, lila_cm, status_bb_u, status_tb_u, status_bb_tb')
        .gte('tanggal_pengukuran', monthStart)
        .lt('tanggal_pengukuran', nextMonth)
        .in('child_id', childIds)

      measurements = measurementData ?? []
    }

    // Build child_id → child lookup
    const childMap: Record<string, any> = {}
    children.forEach((c: any) => { childMap[c.id] = c })

    // Map measurements to Pemantauan
    const pemantauan: EppgbmPemantauan[] = measurements.map((m: any) => {
      const child = childMap[m.child_id]
      return {
        nik_anak: child?.nik ?? null,
        nama_anak: child?.nama ?? '-',
        bulan,
        tanggal_penimbangan: formatDateIndonesian(m.tanggal_pengukuran),
        berat_badan: m.berat_badan_kg != null ? Number(m.berat_badan_kg) : null,
        tinggi_badan: m.tinggi_badan_cm != null ? Number(m.tinggi_badan_cm) : null,
        lingkar_kepala: m.lingkar_kepala_cm != null ? Number(m.lingkar_kepala_cm) : null,
        lila: m.lila_cm != null ? Number(m.lila_cm) : null,
        status_bb_u: m.status_bb_u ?? null,
        status_tb_u: m.status_tb_u ?? null,
        status_bb_tb: m.status_bb_tb ?? null,
      }
    })

    // Generate Excel buffer
    const buffer = generateEppgbmExcel(dataDasar, pemantauan, posyanduNama, bulan)

    // Sanitize filename
    const safeNama = posyanduNama.replace(/[^a-zA-Z0-9\s\-]/g, '').replace(/\s+/g, '_')
    const filename = `eppgbm-${safeNama}-${bulan}.xlsx`

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'EXPORT_DATA',
      resourceType: 'export',
      metadata: { type: 'eppgbm', posyandu_id: posyanduId, bulan },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/export/eppgbm error:', err)
    return NextResponse.json({ error: 'Kesalahan server saat membuat file Excel' }, { status: 500 })
  }
}
