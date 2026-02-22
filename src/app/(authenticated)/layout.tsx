import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserProvider } from '@/lib/context/user-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import type { UserProfile } from '@/types'
import type { ReactNode } from 'react'

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('id, role, nama, nip, phone, posyandu_id, puskesmas_id, district_id, is_active')
    .eq('id', user.id)
    .single()

  const profile: UserProfile | null = profileData ?? null

  return (
    <UserProvider user={user} profile={profile}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </UserProvider>
  )
}
