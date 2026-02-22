import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'

/**
 * GET /api/children/[id]
 * Returns a single child with latest measurements.
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('children')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Data anak tidak ditemukan' }, { status: 404 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'VIEW_CHILD',
      resourceType: 'child',
      resourceId: id,
      ipAddress: _request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: _request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/children/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}

/**
 * PUT /api/children/[id]
 * Update a child record.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>

    // Normalize name fields if provided
    const toTitleCase = (s: string) =>
      s.trim().replace(/\b\w/g, (c) => c.toUpperCase())

    const updates: Record<string, unknown> = { ...body }
    if (typeof body.nama === 'string') {
      updates.nama = toTitleCase(body.nama)
      updates.nama_normalized = (updates.nama as string).toLowerCase()
    }
    if (typeof body.nama_ibu === 'string') {
      updates.nama_ibu = toTitleCase(body.nama_ibu)
      updates.nama_ibu_normalized = (updates.nama_ibu as string).toLowerCase()
    }
    updates.updated_at = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('children')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('PUT /api/children/[id] error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal memperbarui data anak' }, { status: 500 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'EDIT_CHILD',
      resourceType: 'child',
      resourceId: id,
      metadata: { fields: Object.keys(body) },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('PUT /api/children/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}

/**
 * DELETE /api/children/[id]
 * Soft-delete a child record (sets is_active = false).
 */
export async function DELETE(
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

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string } | null

    // Only bidan, tpg, kepala, admin can delete
    const allowedRoles = ['bidan', 'tpg', 'kepala_puskesmas', 'admin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('children')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('DELETE /api/children/[id] error:', error)
      return NextResponse.json({ error: 'Gagal menghapus data anak' }, { status: 500 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      userRole: profile.role,
      action: 'DELETE_CHILD',
      resourceType: 'child',
      resourceId: id,
      ipAddress: _request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: _request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ message: 'Data anak berhasil dihapus' })
  } catch (err) {
    console.error('DELETE /api/children/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
