'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/use-user'
import { ROLE_LABELS, ROLES } from '@/lib/utils/constants'
import { MobileSidebarTrigger } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_CHIP_COLORS: Record<string, string> = {
  [ROLES.KADER]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ROLES.BIDAN]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ROLES.TPG]: 'bg-green-100 text-green-700 border-green-200',
  [ROLES.KEPALA]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ROLES.DINAS]: 'bg-red-100 text-red-700 border-red-200',
  [ROLES.ADMIN]: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function Header() {
  const router = useRouter()
  const { profile, role } = useUser()

  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : ''
  const chipClass = role ? (ROLE_CHIP_COLORS[role] ?? ROLE_CHIP_COLORS[ROLES.ADMIN]) : ''
  const initials = profile?.nama
    ? profile.nama
        .split(' ')
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join('')
    : '?'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 shrink-0">
      {/* Left: Mobile hamburger */}
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger />
        {/* Desktop: breadcrumb placeholder — pages can slot in via portal if needed */}
        <span className="hidden md:block text-sm text-gray-500 font-medium">
          PosyanduDigital
        </span>
      </div>

      {/* Right: User info */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 h-9 px-2 hover:bg-gray-50 rounded-lg"
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border shrink-0',
                chipClass
              )}
            >
              {initials}
            </div>

            {/* Name + role (desktop only) */}
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                {profile?.nama ?? 'Pengguna'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold tracking-wide uppercase leading-4',
                  chipClass
                )}
              >
                {roleLabel}
              </span>
            </div>

            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold text-gray-900 leading-none">
                {profile?.nama ?? 'Pengguna'}
              </p>
              <p
                className={cn(
                  'inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase mt-1',
                  chipClass
                )}
              >
                {roleLabel}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
            <User className="mr-2 h-4 w-4 text-gray-500" />
            <span>Profil Saya</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
