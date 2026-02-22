import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeName } from '@/lib/matching'
import { computeCompositeScore } from '@/lib/matching/composite-score'
import { calculateWFA, calculateLHFA, calculateWFH, classifyAll } from '@/lib/who'
import { logAuditEvent } from '@/lib/audit/logger'
import type { MatchCandidate } from '@/lib/matching/composite-score'

// ─── POST /api/review/commit/[id] ─────────────────────────────────────────────

interface CommitBody {
  approvedRowIds: string[]
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Parse DD/MM/YYYY → YYYY-MM-DD. Returns null on failure. */
function parseDateDMY(dateStr: string | null): string | null {
  if (!dateStr) return null
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Get last day of a bulan_data string like "2025-08" → "2025-08-31" */
function lastDayOfMonth(bulanData: string): string {
  const [y, m] = bulanData.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

/** Compute age in days from ISO date string */
function ageDays(birthDateISO: string, measurementDateISO: string): number {
  const birth = new Date(birthDateISO)
  const measure = new Date(measurementDateISO)
  return Math.floor((measure.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
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

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: CommitBody
  try {
    body = (await req.json()) as CommitBody
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const { approvedRowIds } = body
  if (!Array.isArray(approvedRowIds) || approvedRowIds.length === 0) {
    return NextResponse.json({ error: 'Tidak ada baris yang disetujui' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // ── Fetch document ──────────────────────────────────────────────────────────
  const { data: doc, error: docErr } = await admin
    .from('ocr_documents')
    .select('id, posyandu_id, bulan_data, status')
    .eq('id', id)
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
  }

  const posyanduId: string = doc.posyandu_id
  const bulanData: string = doc.bulan_data ?? ''
  const tanggalPengukuran = bulanData ? lastDayOfMonth(bulanData) : new Date().toISOString().slice(0, 10)

  // ── Fetch approved rows ─────────────────────────────────────────────────────
  const { data: rawRows, error: rowsErr } = await admin
    .from('ocr_extracted_rows')
    .select('*')
    .in('id', approvedRowIds)

  if (rowsErr) {
    return NextResponse.json({ error: 'Gagal memuat baris' }, { status: 500 })
  }

  // ── Fetch all children in posyandu for matching ──────────────────────────────
  const { data: existingChildren } = await admin
    .from('children')
    .select('id, nama, tanggal_lahir, nama_ibu, nik')
    .eq('posyandu_id', posyanduId)

  const candidates: MatchCandidate[] = ((existingChildren ?? []) as Array<{
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

  // ── Process each approved row ────────────────────────────────────────────────
  let committed = 0
  let createdChildren = 0
  let matchedChildren = 0
  const errors: string[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const rawRow of (rawRows ?? []) as any[]) {
    try {
      // Apply saved corrections from DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbCorrections: Record<string, string> = (rawRow.corrections as any) ?? {}

      const get = (field: string) => (dbCorrections[field] ?? rawRow[field] ?? null) as string | null

      const namaAnak = get('nama_anak')
      const tanggalLahirRaw = get('tanggal_lahir')
      const jenisKelaminRaw = get('jenis_kelamin')
      const namaIbu = get('nama_ibu')
      const bbSekarangRaw = get('bb_sekarang')
      const tbRaw = get('tb')

      // Parse values
      const tanggalLahirISO = parseDateDMY(tanggalLahirRaw)
      const bbKg = bbSekarangRaw ? parseFloat(bbSekarangRaw.replace(',', '.')) : null
      const tbCm = tbRaw ? parseFloat(tbRaw.replace(',', '.')) : null
      const jenisKelamin: 'L' | 'P' | null =
        jenisKelaminRaw === 'L' || jenisKelaminRaw === 'P' ? jenisKelaminRaw : null

      if (!namaAnak) {
        errors.push(`Baris ${rawRow.row_index + 1}: nama anak kosong, dilewati`)
        continue
      }
      if (!tanggalLahirISO) {
        errors.push(`Baris ${rawRow.row_index + 1}: tanggal lahir tidak valid (${tanggalLahirRaw})`)
        // Continue but use null DOB
      }
      if (!jenisKelamin) {
        errors.push(`Baris ${rawRow.row_index + 1}: jenis kelamin tidak valid (${jenisKelaminRaw})`)
        // Continue — use null
      }

      // ── Child matching ────────────────────────────────────────────────────
      let childId: string | null = null
      let needsDedupReview = false

      if (tanggalLahirISO && candidates.length > 0) {
        const scores = candidates.map((c) =>
          computeCompositeScore(
            {
              nama: namaAnak,
              tanggal_lahir: tanggalLahirISO,
              nama_ibu: namaIbu ?? undefined,
            },
            c
          )
        )
        const best = scores.reduce((a, b) => (b.score > a.score ? b : a))

        if (best.score >= 0.95) {
          childId = best.child_id
          matchedChildren++
        } else if (best.score >= 0.75) {
          needsDedupReview = true
        }
      }

      // ── Create child if not matched ───────────────────────────────────────
      if (!childId) {
        const childInsert: Record<string, unknown> = {
          nama: namaAnak,
          nama_normalized: normalizeName(namaAnak),
          tanggal_lahir: tanggalLahirISO ?? '1900-01-01', // fallback to avoid null constraint
          jenis_kelamin: jenisKelamin ?? 'L',
          nama_ibu: namaIbu ?? null,
          nama_ibu_normalized: namaIbu ? normalizeName(namaIbu) : null,
          posyandu_id: posyanduId,
          source_type: 'ocr',
          consent_given: true,
          created_by: user.id,
        }

        if (needsDedupReview) {
          childInsert.keterangan = 'needs_dedup_review'
        }

        const { data: newChild, error: childErr } = await admin
          .from('children')
          .insert(childInsert)
          .select('id')
          .single()

        if (childErr || !newChild) {
          errors.push(
            `Baris ${rawRow.row_index + 1}: gagal membuat anak (${childErr?.message ?? 'unknown'})`
          )
          continue
        }

        childId = newChild.id
        createdChildren++

        // Add to candidates for subsequent matches within same commit
        candidates.push({
          child_id: childId!,
          nama: namaAnak,
          tanggal_lahir: tanggalLahirISO ?? '1900-01-01',
          nama_ibu: namaIbu,
          nik: null,
        })
      }

      // ── Z-score calculation ────────────────────────────────────────────────
      let zBBU: number | null = null
      let zTBU: number | null = null
      let zBBTB: number | null = null
      let statusBBU: string | null = null
      let statusTBU: string | null = null
      let statusBBTB: string | null = null
      let umurBulan = 0

      if (tanggalLahirISO && bbKg && tbCm && jenisKelamin) {
        try {
          const days = ageDays(tanggalLahirISO, tanggalPengukuran)
          umurBulan = Math.floor(days / 30.44)
          const classification = classifyAll({
            weightKg: bbKg,
            heightCm: tbCm,
            ageDays: days,
            sex: jenisKelamin,
            hasEdema: false,
            measurementType: 'TB',
          })
          zBBU = classification.zscore_bb_u
          zTBU = classification.zscore_tb_u
          zBBTB = classification.zscore_bb_tb
          statusBBU = classification.bb_u
          statusTBU = classification.tb_u
          statusBBTB = classification.bb_tb
        } catch (zErr) {
          console.error(`Z-score error for row ${rawRow.row_index}:`, zErr)
          // Continue without z-scores
        }
      } else if (tanggalLahirISO) {
        umurBulan = Math.floor(ageDays(tanggalLahirISO, tanggalPengukuran) / 30.44)
      }

      // ── Create measurement ─────────────────────────────────────────────────
      const { error: measErr } = await admin.from('measurements').insert({
        child_id: childId,
        posyandu_id: posyanduId,
        tanggal_pengukuran: tanggalPengukuran,
        umur_bulan: umurBulan,
        berat_badan_kg: bbKg ?? null,
        tinggi_badan_cm: tbCm ?? null,
        zscore_bb_u: zBBU,
        zscore_tb_u: zTBU,
        zscore_bb_tb: zBBTB,
        status_bb_u: statusBBU,
        status_tb_u: statusTBU,
        status_bb_tb: statusBBTB,
        source_type: 'ocr',
        ocr_document_id: id,
        created_by: user.id,
      })

      if (measErr) {
        errors.push(
          `Baris ${rawRow.row_index + 1}: gagal membuat pengukuran (${measErr.message})`
        )
        continue
      }

      // ── Update row with matched child_id + approved ─────────────────────────
      await admin
        .from('ocr_extracted_rows')
        .update({
          matched_child_id: childId,
          is_approved: true,
          is_reviewed: true,
        })
        .eq('id', rawRow.id)

      committed++
    } catch (err) {
      errors.push(`Baris ${rawRow.row_index + 1}: kesalahan tidak terduga (${String(err)})`)
    }
  }

  // ── Update document status ────────────────────────────────────────────────
  await admin
    .from('ocr_documents')
    .update({
      status: 'committed',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Audit log
  void logAuditEvent({
    userId: user.id,
    action: 'COMMIT_OCR',
    resourceType: 'ocr_document',
    resourceId: id,
    metadata: { committed, created_children: createdChildren, matched_children: matchedChildren, posyandu_id: posyanduId },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({
    committed,
    created_children: createdChildren,
    matched_children: matchedChildren,
    errors,
  })
}
