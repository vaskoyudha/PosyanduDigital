import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'

/**
 * GET /api/measurements/[id]
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
      .from('measurements')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Data pengukuran tidak ditemukan' }, { status: 404 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'VIEW_MEASUREMENT',
      resourceType: 'measurement',
      resourceId: id,
      ipAddress: _request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: _request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/measurements/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}

/**
 * PUT /api/measurements/[id]
 * Update a measurement (non-calculated fields only; Z-scores are recalculated).
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
    const updates = { ...body, updated_at: new Date().toISOString() }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('measurements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('PUT /api/measurements/[id] error:', error)
      return NextResponse.json({ error: 'Gagal memperbarui data pengukuran' }, { status: 500 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      action: 'EDIT_MEASUREMENT',
      resourceType: 'measurement',
      resourceId: id,
      metadata: { fields: Object.keys(body) },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('PUT /api/measurements/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}

/**
 * DELETE /api/measurements/[id]
 * Delete a measurement (hard delete — OK for corrections).
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
    const allowedRoles = ['bidan', 'tpg', 'kepala_puskesmas', 'admin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('measurements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('DELETE /api/measurements/[id] error:', error)
      return NextResponse.json({ error: 'Gagal menghapus data pengukuran' }, { status: 500 })
    }

    // Audit log
    void logAuditEvent({
      userId: user.id,
      userRole: profile.role,
      action: 'DELETE_MEASUREMENT',
      resourceType: 'measurement',
      resourceId: id,
      ipAddress: _request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: _request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ message: 'Data pengukuran berhasil dihapus' })
  } catch (err) {
    console.error('DELETE /api/measurements/[id] error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
