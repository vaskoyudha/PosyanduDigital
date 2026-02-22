import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/logger'

/**
 * GET /api/audit
 * Returns audit log entries. Admin-only (kepala_puskesmas, dinas, admin).
 * Query params: limit, offset, action, from, to
 */
export async function GET(request: NextRequest) {
  try {
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
    const allowedRoles = ['kepala_puskesmas', 'dinas', 'admin']

    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)
    const action = searchParams.get('action')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Use admin client to bypass RLS and fetch all audit logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    let query = admin
      .from('audit_logs')
      .select('id, user_id, user_role, action, resource_type, resource_id, details, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) {
      query = query.eq('action', action)
    }
    if (from) {
      query = query.gte('created_at', `${from}T00:00:00`)
    }
    if (to) {
      query = query.lte('created_at', `${to}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.error('GET /api/audit error:', error)
      return NextResponse.json({ error: 'Gagal mengambil log audit' }, { status: 500 })
    }

    // Log the view action
    void logAuditEvent({
      userId: user.id,
      userRole: profile.role,
      action: 'VIEW_AUDIT_LOG',
      resourceType: 'audit_log',
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/audit unexpected error:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
