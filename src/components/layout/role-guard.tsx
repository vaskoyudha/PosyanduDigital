'use client'

import type { ReactNode } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import type { UserRole } from '@/types'

export interface RoleGuardProps {
  readonly roles: UserRole[]
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

/**
 * Conditionally renders children only if the current user's role
 * is included in the `roles` array.
 *
 * Usage:
 * ```tsx
 * <RoleGuard roles={['tpg', 'kepala_puskesmas', 'admin']}>
 *   <SensitiveContent />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { role, isLoading } = useUser()

  // While loading, don't render either way (avoid flash)
  if (isLoading) return null

  if (!role || !roles.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
