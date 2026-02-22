/**
 * Unit tests for Audit Logger
 *
 * Mocks createAdminClient to avoid real Supabase calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track insert calls
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Import AFTER mocking
import { logAuditEvent, type AuditAction } from '../logger'

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('does not throw when called', async () => {
    await expect(
      logAuditEvent({
        userId: 'user-1',
        action: 'VIEW_CHILD',
      })
    ).resolves.toBeUndefined()
  })

  it('inserts to audit_logs table', async () => {
    await logAuditEvent({
      userId: 'user-1',
      userRole: 'kader',
      action: 'CREATE_CHILD',
      resourceType: 'child',
      resourceId: 'child-123',
    })

    expect(mockFrom).toHaveBeenCalledWith('audit_logs')
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('includes all required fields in the insert', async () => {
    await logAuditEvent({
      userId: 'user-42',
      userRole: 'bidan',
      action: 'EDIT_MEASUREMENT',
      resourceType: 'measurement',
      resourceId: 'meas-99',
      metadata: { old_weight: 8.5, new_weight: 9.0 },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    })

    const insertArg = mockInsert.mock.calls[0][0]
    expect(insertArg).toEqual({
      user_id: 'user-42',
      user_role: 'bidan',
      action: 'EDIT_MEASUREMENT',
      resource_type: 'measurement',
      resource_id: 'meas-99',
      details: { old_weight: 8.5, new_weight: 9.0 },
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
    })
  })

  it('sets optional fields to null when not provided', async () => {
    await logAuditEvent({
      userId: 'user-1',
      action: 'EXPORT_DATA',
    })

    const insertArg = mockInsert.mock.calls[0][0]
    expect(insertArg.user_role).toBeNull()
    expect(insertArg.resource_type).toBeNull()
    expect(insertArg.resource_id).toBeNull()
    expect(insertArg.details).toBeNull()
    expect(insertArg.ip_address).toBeNull()
    expect(insertArg.user_agent).toBeNull()
  })

  it('does not throw on Supabase error (fire-and-forget)', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB down' } })

    await expect(
      logAuditEvent({
        userId: 'user-1',
        action: 'DELETE_CHILD',
      })
    ).resolves.toBeUndefined()
  })

  it('does not throw on unexpected exception', async () => {
    mockInsert.mockRejectedValue(new Error('Connection reset'))

    await expect(
      logAuditEvent({
        userId: 'user-1',
        action: 'VIEW_AUDIT_LOG',
      })
    ).resolves.toBeUndefined()
  })

  it('handles all defined action types', async () => {
    const actions: AuditAction[] = [
      'VIEW_CHILD',
      'CREATE_CHILD',
      'EDIT_CHILD',
      'DELETE_CHILD',
      'VIEW_MEASUREMENT',
      'CREATE_MEASUREMENT',
      'EDIT_MEASUREMENT',
      'DELETE_MEASUREMENT',
      'VIEW_OCR',
      'APPROVE_OCR',
      'COMMIT_OCR',
      'EXPORT_DATA',
      'VIEW_AUDIT_LOG',
    ]

    for (const action of actions) {
      vi.clearAllMocks()
      await logAuditEvent({ userId: 'test-user', action })
      expect(mockFrom).toHaveBeenCalledWith('audit_logs')
    }
  })
})
