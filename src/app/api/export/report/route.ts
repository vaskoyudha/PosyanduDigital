/**
 * GET /api/export/report
 *
 * Export PDF "Laporan Bulanan Gizi" for a puskesmas + month.
 * Query params: puskesmas_id, bulan (YYYY-MM)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'
import { calculateSKDN } from '@/lib/analytics/skdn'
import { getPrevalence } from '@/lib/analytics/prevalence'
import { getAlerts } from '@/lib/analytics/alerts'
import { generateMonthlyReport, type PdfReportData } from '@/lib/export/generate-pdf'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const puskesmasId = searchParams.get('puskesmas_id')
    const bulan = searchParams.get('bulan')

    if (!puskesmasId || !bulan) {
      return NextResponse.json(
        { error: 'Parameter puskesmas_id dan bulan wajib diisi' },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}$/.test(bulan)) {
      return NextResponse.json({ error: 'Format bulan tidak valid (YYYY-MM)' }, { status: 400 })
    }

    // Get puskesmas info
    const { data: puskesmas } = await (supabase as any)
      .from('puskesmas')
      .select('id, nama')
      .eq('id', puskesmasId)
      .maybeSingle()

    if (!puskesmas) {
      return NextResponse.json({ error: 'Puskesmas tidak ditemukan' }, { status: 404 })
    }

    const puskesmasNama: string = puskesmas.nama ?? 'Puskesmas'

    // Get posyandu list for this puskesmas
    const { data: posyanduList } = await (supabase as any)
      .from('posyandu')
      .select('id, nama')
      .eq('puskesmas_id', puskesmasId)
      .order('nama', { ascending: true })

    const posyandus: any[] = posyanduList ?? []

    if (posyandus.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada posyandu di puskesmas ini' },
        { status: 404 }
      )
    }

    // Use first posyandu for SKDN (or could aggregate — using first for now)
    const firstPosyandu = posyandus[0]
    const posyanduNama: string = firstPosyandu.nama ?? 'Posyandu'

    // Fetch SKDN, prevalence, and alerts in parallel
    const [skdn, prevalence, allAlerts] = await Promise.all([
      calculateSKDN(supabase as any, firstPosyandu.id, bulan),
      getPrevalence(supabase as any, 'puskesmas', puskesmasId, bulan),
      getAlerts(supabase as any, puskesmasId),
    ])

    // Separate BGM and 2T alerts
    const bgmList = allAlerts.filter(a => a.alertType === 'BGM')
    const twoTList = allAlerts.filter(a => a.alertType === '2T')

    // Count total active children across all posyandu
    const posyanduIds: string[] = posyandus.map((p: any) => p.id)
    const { data: childCount } = await (supabase as any)
      .from('children')
      .select('id', { count: 'exact', head: true })
      .in('posyandu_id', posyanduIds)
      .eq('is_active', true)

    const totalChildren: number = childCount?.length ?? 0

    const reportData: PdfReportData = {
      posyanduNama,
      puskesmasNama,
      bulan,
      skdn,
      prevalence,
      bgmList,
      twoTList,
      totalChildren,
    }

    const buffer = generateMonthlyReport(reportData)

    const safeNama = puskesmasNama.replace(/[^a-zA-Z0-9\s\-]/g, '').replace(/\s+/g, '_')
    const filename = `laporan-gizi-${safeNama}-${bulan}.pdf`

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'EXPORT_DATA',
      resourceType: 'export',
      metadata: { type: 'report', puskesmas_id: puskesmasId, bulan },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/export/report error:', err)
    return NextResponse.json({ error: 'Kesalahan server saat membuat PDF' }, { status: 500 })
  }
}
