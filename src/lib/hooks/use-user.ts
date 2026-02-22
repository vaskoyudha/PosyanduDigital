'use client'

import { useUserContext } from '@/lib/context/user-context'
import type { UserRole } from '@/types'

export interface UseUserReturn {
  user: ReturnType<typeof useUserContext>['user']
  profile: ReturnType<typeof useUserContext>['profile']
  role: UserRole | null
  posyandu_id: string | null
  puskesmas_id: string | null
  isLoading: boolean
}

export function useUser(): UseUserReturn {
  const { user, profile, isLoading } = useUserContext()

  return {
    user,
    profile,
    role: profile?.role ?? null,
    posyandu_id: profile?.posyandu_id ?? null,
    puskesmas_id: profile?.puskesmas_id ?? null,
    isLoading,
  }
}
