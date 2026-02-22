'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

export interface UserContextValue {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
}

export const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  isLoading: false,
})

export interface UserProviderProps {
  readonly children: ReactNode
  readonly user: User | null
  readonly profile: UserProfile | null
}

export function UserProvider({ children, user, profile }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ user, profile, isLoading: false }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserContext)
  return ctx
}
