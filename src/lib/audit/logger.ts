import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  | 'VIEW_CHILD'
  | 'CREATE_CHILD'
  | 'EDIT_CHILD'
  | 'DELETE_CHILD'
  | 'VIEW_MEASUREMENT'
  | 'CREATE_MEASUREMENT'
  | 'EDIT_MEASUREMENT'
  | 'DELETE_MEASUREMENT'
  | 'VIEW_OCR'
  | 'APPROVE_OCR'
  | 'COMMIT_OCR'
  | 'EXPORT_DATA'
  | 'VIEW_AUDIT_LOG'

interface AuditEventParams {
  userId: string
  userRole?: string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit event to the audit_logs table.
 * Uses admin client (service role) to bypass RLS.
 * Fire-and-forget: never throws, never blocks calling code.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    await admin.from('audit_logs').insert({
      user_id: params.userId,
      user_role: params.userRole ?? null,
      action: params.action,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      details: params.metadata ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
  } catch {
    // Audit failure must never block user requests
  }
}
