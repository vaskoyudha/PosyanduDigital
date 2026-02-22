import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ExtractedRow } from '@/types/ocr'

// ─── GET /api/ocr/result/[id] ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  // ── Get user profile for posyandu_id ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('user_profiles')
    .select('posyandu_id, role, puskesmas_id, district_id')
    .eq('id', user.id)
    .single() as { data: { posyandu_id: string | null; role: string; puskesmas_id: string | null; district_id: string | null } | null }

  if (!profile) {
    return NextResponse.json({ error: 'Profil pengguna tidak ditemukan' }, { status: 403 })
  }

  // ── Fetch document ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: doc, error: docErr } = await admin
    .from('ocr_documents')
    .select(
      'id, posyandu_id, original_filename, status, bulan_data, overall_confidence, storage_path'
    )
    .eq('id', id)
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
  }

  // ── Verify access ────────────────────────────────────────────────────────────
  // kader/bidan: only their posyandu
  // tpg/kepala_puskesmas: their puskesmas posyandus (we'll simplify to posyandu check for now)
  // dinas/admin: any
  const canAccess =
    profile.role === 'admin' ||
    profile.role === 'dinas' ||
    doc.posyandu_id === profile.posyandu_id

  if (!canAccess) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // ── Fetch extracted rows ────────────────────────────────────────────────────
  const { data: rawRows, error: rowsErr } = await admin
    .from('ocr_extracted_rows')
    .select('*')
    .eq('document_id', id)
    .order('row_index', { ascending: true })

  if (rowsErr) {
    return NextResponse.json({ error: 'Gagal memuat baris' }, { status: 500 })
  }

  // ── Map snake_case DB → camelCase ExtractedRow ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: ExtractedRow[] = (rawRows ?? []).map((r: any) => ({
    id: r.id,
    rowIndex: r.row_index,
    namaAnak: r.nama_anak,
    namaAnakConfidence: r.nama_anak_confidence,
    tanggalLahir: r.tanggal_lahir,
    tanggalLahirConfidence: r.tanggal_lahir_confidence,
    umur: r.umur,
    umurConfidence: r.umur_confidence,
    jenisKelamin: r.jenis_kelamin,
    jenisKelaminConfidence: r.jenis_kelamin_confidence,
    namaIbu: r.nama_ibu,
    namaIbuConfidence: r.nama_ibu_confidence,
    alamat: r.alamat,
    alamatConfidence: r.alamat_confidence,
    bbLalu: r.bb_lalu,
    bbLaluConfidence: r.bb_lalu_confidence,
    bbSekarang: r.bb_sekarang,
    bbSekarangConfidence: r.bb_sekarang_confidence,
    tb: r.tb,
    tbConfidence: r.tb_confidence,
    statusNt: r.status_nt,
    statusNtConfidence: r.status_nt_confidence,
    bbox: r.bbox ?? null,
    isReviewed: r.is_reviewed,
    isApproved: r.is_approved,
    corrections: r.corrections ?? null,
  }))

  // ── Generate signed image URL (24h) ─────────────────────────────────────────
  let imageUrl = ''
  if (doc.storage_path) {
    const { data: signedData } = await admin.storage
      .from('ocr-documents')
      .createSignedUrl(doc.storage_path, 60 * 60 * 24)
    imageUrl = signedData?.signedUrl ?? ''
  }

  return NextResponse.json({
    document: {
      id: doc.id,
      posyandu_id: doc.posyandu_id,
      original_filename: doc.original_filename,
      status: doc.status,
      bulan_data: doc.bulan_data,
      overall_confidence: doc.overall_confidence,
    },
    rows,
    imageUrl,
  })
}
