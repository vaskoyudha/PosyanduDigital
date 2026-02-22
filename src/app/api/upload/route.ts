import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STORAGE_BUCKET, ACCEPTED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/utils/constants'

const ALLOWED_ROLES = ['kader', 'bidan', 'tpg']

/**
 * POST /api/upload
 * Upload an OCR document image to Supabase Storage and create an ocr_documents row.
 * Body: FormData { file: File, bulan_data: string, posyandu_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, posyandu_id')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 })
    }

    const profile = profileData as { role: string; posyandu_id: string | null }

    // Check role
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengunggah dokumen' },
        { status: 403 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bulanData = formData.get('bulan_data') as string | null
    const posyanduId = formData.get('posyandu_id') as string | null

    if (!file || !bulanData || !posyanduId) {
      return NextResponse.json(
        { error: 'File, bulan data, dan posyandu ID wajib diisi' },
        { status: 400 }
      )
    }

    // Validate bulan_data format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(bulanData)) {
      return NextResponse.json(
        { error: 'Format bulan data tidak valid (YYYY-MM)' },
        { status: 400 }
      )
    }

    // Validate posyandu_id for kader role
    if (profile.role === 'kader' && profile.posyandu_id !== posyanduId) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke posyandu ini' },
        { status: 403 }
      )
    }

    // Validate file type
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan JPEG, PNG, HEIC, WebP, atau PDF.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas 10MB' },
        { status: 400 }
      )
    }

    // Generate storage path
    const uuid = crypto.randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${posyanduId}/${bulanData}/${uuid}-${safeName}`

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const admin = createAdminClient()
    const fileBuffer = await file.arrayBuffer()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: uploadError } = await (admin.storage as any)
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Gagal mengunggah file ke penyimpanan' },
        { status: 500 }
      )
    }

    // Create ocr_documents row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: docData, error: insertError } = await (admin as any)
      .from('ocr_documents')
      .insert({
        posyandu_id: posyanduId,
        uploaded_by: user.id,
        storage_path: storagePath,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        status: 'uploaded',
        bulan_data: bulanData,
      })
      .select('id')
      .single()

    if (insertError || !docData) {
      console.error('Insert ocr_documents error:', insertError)
      // Attempt to clean up uploaded file
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.storage as any).from(STORAGE_BUCKET).remove([storagePath])
      return NextResponse.json(
        { error: 'Gagal menyimpan data dokumen' },
        { status: 500 }
      )
    }

    const documentId = (docData as { id: string }).id

    // Fire-and-forget: notify OCR worker
    if (process.env.WORKER_URL) {
      fetch(`${process.env.WORKER_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          storage_path: storagePath,
        }),
      }).catch(() => {
        // Worker call is fire-and-forget — swallow errors
      })
    }

    return NextResponse.json(
      { document_id: documentId, storage_path: storagePath },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/upload unexpected error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
