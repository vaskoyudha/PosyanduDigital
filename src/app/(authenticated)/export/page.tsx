import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExportPageClient } from '@/components/export/export-page-client'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('user_profiles')
    .select('role, posyandu_id, puskesmas_id, district_id')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/login')

  const profile = profileData as {
    role: string
    posyandu_id: string | null
    puskesmas_id: string | null
    district_id: string | null
  }

  // Determine which posyandu the user can access
  let posyanduList: { id: string; nama: string; puskesmas_id: string | null }[] = []
  let puskesmasList: { id: string; nama: string }[] = []

  if (profile.role === 'kader') {
    // Kader: only their posyandu
    if (profile.posyandu_id) {
      const { data } = await (supabase as any)
        .from('posyandu')
        .select('id, nama, puskesmas_id')
        .eq('id', profile.posyandu_id)
      posyanduList = data ?? []
    }
  } else if (profile.role === 'bidan' || profile.role === 'tpg') {
    // Bidan/TPG: all posyandu in their puskesmas
    if (profile.puskesmas_id) {
      const { data } = await (supabase as any)
        .from('posyandu')
        .select('id, nama, puskesmas_id')
        .eq('puskesmas_id', profile.puskesmas_id)
        .order('nama', { ascending: true })
      posyanduList = data ?? []

      const { data: pkData } = await (supabase as any)
        .from('puskesmas')
        .select('id, nama')
        .eq('id', profile.puskesmas_id)
      puskesmasList = pkData ?? []
    }
  } else if (profile.role === 'kepala_puskesmas') {
    // Kepala: all posyandu in puskesmas
    if (profile.puskesmas_id) {
      const { data } = await (supabase as any)
        .from('posyandu')
        .select('id, nama, puskesmas_id')
        .eq('puskesmas_id', profile.puskesmas_id)
        .order('nama', { ascending: true })
      posyanduList = data ?? []

      const { data: pkData } = await (supabase as any)
        .from('puskesmas')
        .select('id, nama')
        .eq('id', profile.puskesmas_id)
      puskesmasList = pkData ?? []
    }
  } else if (profile.role === 'dinas' || profile.role === 'admin') {
    // Dinas/Admin: all in district or all
    if (profile.district_id) {
      const { data: pkData } = await (supabase as any)
        .from('puskesmas')
        .select('id, nama')
        .eq('district_id', profile.district_id)
        .order('nama', { ascending: true })
      puskesmasList = pkData ?? []

      const pkIds: string[] = (pkData ?? []).map((p: any) => p.id)
      if (pkIds.length > 0) {
        const { data } = await (supabase as any)
          .from('posyandu')
          .select('id, nama, puskesmas_id')
          .in('puskesmas_id', pkIds)
          .order('nama', { ascending: true })
        posyanduList = data ?? []
      }
    } else {
      // No district_id — fetch all puskesmas
      const { data: pkData } = await (supabase as any)
        .from('puskesmas')
        .select('id, nama')
        .order('nama', { ascending: true })
        .limit(100)
      puskesmasList = pkData ?? []

      const pkIds: string[] = (pkData ?? []).map((p: any) => p.id)
      if (pkIds.length > 0) {
        const { data } = await (supabase as any)
          .from('posyandu')
          .select('id, nama, puskesmas_id')
          .in('puskesmas_id', pkIds)
          .order('nama', { ascending: true })
          .limit(500)
        posyanduList = data ?? []
      }
    }
  }

  return (
    <ExportPageClient
      posyanduList={posyanduList}
      puskesmasList={puskesmasList}
      userRole={profile.role}
      userPuskesmasId={profile.puskesmas_id}
    />
  )
}
