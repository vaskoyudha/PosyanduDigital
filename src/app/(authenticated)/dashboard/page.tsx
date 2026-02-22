import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile) {
    redirect('/login')
  }

  switch (profile.role) {
    case ROLES.KADER:
      redirect('/dashboard/kader')
    case ROLES.BIDAN:
      redirect('/dashboard/bidan')
    case ROLES.TPG:
      redirect('/dashboard/tpg')
    case ROLES.KEPALA:
      redirect('/dashboard/kepala')
    case ROLES.DINAS:
      redirect('/dashboard/dinas')
    case ROLES.ADMIN:
      redirect('/dashboard/kader') // Admin sees kader view by default
    default:
      redirect('/login')
  }
}
