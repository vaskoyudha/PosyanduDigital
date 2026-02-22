import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── PUT /api/review/[id] ─────────────────────────────────────────────────────

interface CorrectionItem {
  rowId: string
  field: string
  value: string
}

// Map camelCase field names → snake_case DB columns
const FIELD_MAP: Record<string, string> = {
  namaAnak: 'nama_anak',
  tanggalLahir: 'tanggal_lahir',
  umur: 'umur',
  jenisKelamin: 'jenis_kelamin',
  namaIbu: 'nama_ibu',
  alamat: 'alamat',
  bbLalu: 'bb_lalu',
  bbSekarang: 'bb_sekarang',
  tb: 'tb',
  statusNt: 'status_nt',
}

export async function PUT(
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
  let body: { corrections: CorrectionItem[] }
  try {
    body = (await req.json()) as { corrections: CorrectionItem[] }
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const { corrections } = body
  if (!Array.isArray(corrections) || corrections.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  // ── Group corrections by rowId ───────────────────────────────────────────────
  const byRow = new Map<string, Record<string, string>>()
  for (const c of corrections) {
    if (!c.rowId || !c.field) continue
    const dbField = FIELD_MAP[c.field]
    if (!dbField) continue
    if (!byRow.has(c.rowId)) byRow.set(c.rowId, {})
    byRow.get(c.rowId)![dbField] = c.value
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  let updated = 0
  const errors: string[] = []

  for (const [rowId, fields] of byRow) {
    try {
      const { error } = await admin
        .from('ocr_extracted_rows')
        .update({
          ...fields,
          is_reviewed: true,
        })
        .eq('id', rowId)

      if (error) {
        errors.push(`Baris ${rowId}: ${error.message}`)
      } else {
        updated++
      }
    } catch (err) {
      errors.push(`Baris ${rowId}: ${String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, updated, errors })
}
