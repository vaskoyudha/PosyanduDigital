export type { Database, UserRole, OcrStatus, StatusNaik, JenisKelamin, Json } from './database'

export interface UserProfile {
  id: string
  role: import('./database').UserRole
  nama: string
  nip: string | null
  phone: string | null
  posyandu_id: string | null
  puskesmas_id: string | null
  district_id: string | null
  is_active: boolean
}

export interface AppUser {
  id: string
  email: string | undefined
  profile: UserProfile | null
}
