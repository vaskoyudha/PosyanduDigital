'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/hooks/use-user'
import { ROLES } from '@/lib/utils/constants'
import { Home, Upload, Baby, MoreHorizontal } from 'lucide-react'
import type { UserRole } from '@/types'

interface MobileNavTab {
  label: string
  href: string
  icon: React.ElementType
}

// 4-tab mobile navigation per role
function getMobileTabs(role: UserRole | null): MobileNavTab[] {
  switch (role) {
    case ROLES.KADER:
      return [
        { label: 'Beranda', href: '/dashboard/kader', icon: Home },
        { label: 'Unggah', href: '/upload', icon: Upload },
        { label: 'Anak', href: '/children', icon: Baby },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
    case ROLES.BIDAN:
      return [
        { label: 'Beranda', href: '/dashboard/bidan', icon: Home },
        { label: 'Unggah', href: '/upload', icon: Upload },
        { label: 'Anak', href: '/children', icon: Baby },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
    case ROLES.TPG:
      return [
        { label: 'Beranda', href: '/dashboard/tpg', icon: Home },
        { label: 'Unggah', href: '/upload', icon: Upload },
        { label: 'Anak', href: '/children', icon: Baby },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
    case ROLES.KEPALA:
      return [
        { label: 'Beranda', href: '/dashboard/kepala', icon: Home },
        { label: 'Anak', href: '/children', icon: Baby },
        { label: 'Posyandu', href: '/posyandu', icon: Baby },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
    case ROLES.DINAS:
      return [
        { label: 'Beranda', href: '/dashboard/dinas', icon: Home },
        { label: 'Posyandu', href: '/posyandu', icon: Baby },
        { label: 'Ekspor', href: '/export', icon: Upload },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
    case ROLES.ADMIN:
      return [
        { label: 'Beranda', href: '/dashboard/kader', icon: Home },
        { label: 'Unggah', href: '/upload', icon: Upload },
        { label: 'Anak', href: '/children', icon: Baby },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
    default:
      return [
        { label: 'Beranda', href: '/dashboard', icon: Home },
        { label: 'Lainnya', href: '/settings', icon: MoreHorizontal },
      ]
  }
}

export function MobileNav() {
  const pathname = usePathname()
  const { role } = useUser()
  const tabs = getMobileTabs(role)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)]"
      aria-label="Navigasi bawah"
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== '/dashboard' &&
            !tab.href.startsWith('/dashboard/') === false &&
            pathname.startsWith(tab.href)) ||
          pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
              isActive ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <tab.icon
              className={cn(
                'h-5 w-5 transition-colors',
                isActive ? 'text-green-600' : 'text-gray-400'
              )}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-green-500" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
