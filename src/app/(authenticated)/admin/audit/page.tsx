import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Shield } from 'lucide-react'
import { type AuditLogEntry } from '@/components/admin/audit-log-table'

// Lazy-load the audit log table (client-side filtering, admin-only page)
const AuditLogTable = dynamic(
  () => import('@/components/admin/audit-log-table').then(mod => mod.AuditLogTable),
  { ssr: false }
)

const ALLOWED_ROLES = ['kepala_puskesmas', 'dinas', 'admin']

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch last 200 audit log entries via admin client (bypasses RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: logsData } = await admin
    .from('audit_logs')
    .select('id, user_id, user_role, action, resource_type, resource_id, details, ip_address, user_agent, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const logs: AuditLogEntry[] = logsData ?? []

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
          <Shield className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Log Akses</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat akses dan perubahan data sesuai UU PDP
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <AuditLogTable logs={logs} />
    </div>
  )
}
