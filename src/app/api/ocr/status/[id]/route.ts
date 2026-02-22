import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/ocr/status/[id]
 * Returns the current OCR processing status for a document.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Fetch document status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('ocr_documents')
      .select('status, progress_pct, error_message')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    const doc = data as { status: string; progress_pct: number | null; error_message: string | null }

    return NextResponse.json({
      status: doc.status,
      progress_pct: doc.progress_pct ?? 0,
      error_message: doc.error_message,
    })
  } catch (err) {
    console.error('GET /api/ocr/status/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
