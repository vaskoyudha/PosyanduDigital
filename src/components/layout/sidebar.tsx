'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/hooks/use-user'
import { ROLE_LABELS, ROLES } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home,
  Upload,
  Eye,
  Baby,
  Building2,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Menu,
  Shield,
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  [ROLES.KADER]: [
    { label: 'Beranda', href: '/dashboard/kader', icon: Home },
    { label: 'Unggah', href: '/upload', icon: Upload },
    { label: 'Anak', href: '/children', icon: Baby },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ],
  [ROLES.BIDAN]: [
    { label: 'Beranda', href: '/dashboard/bidan', icon: Home },
    { label: 'Unggah', href: '/upload', icon: Upload },
    { label: 'Tinjauan', href: '/review', icon: Eye },
    { label: 'Anak', href: '/children', icon: Baby },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ],
  [ROLES.TPG]: [
    { label: 'Beranda', href: '/dashboard/tpg', icon: Home },
    { label: 'Unggah', href: '/upload', icon: Upload },
    { label: 'Tinjauan', href: '/review', icon: Eye },
    { label: 'Anak', href: '/children', icon: Baby },
    { label: 'Posyandu', href: '/posyandu', icon: Building2 },
    { label: 'Ekspor', href: '/export', icon: Download },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ],
  [ROLES.KEPALA]: [
    { label: 'Beranda', href: '/dashboard/kepala', icon: Home },
    { label: 'Tinjauan', href: '/review', icon: Eye },
    { label: 'Anak', href: '/children', icon: Baby },
    { label: 'Posyandu', href: '/posyandu', icon: Building2 },
    { label: 'Ekspor', href: '/export', icon: Download },
    { label: 'Log Akses', href: '/admin/audit', icon: Shield },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ],
  [ROLES.DINAS]: [
    { label: 'Beranda', href: '/dashboard/dinas', icon: Home },
    { label: 'Posyandu', href: '/posyandu', icon: Building2 },
    { label: 'Ekspor', href: '/export', icon: Download },
    { label: 'Log Akses', href: '/admin/audit', icon: Shield },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ],
  [ROLES.ADMIN]: [
    { label: 'Beranda', href: '/dashboard/kader', icon: Home },
    { label: 'Unggah', href: '/upload', icon: Upload },
    { label: 'Tinjauan', href: '/review', icon: Eye },
    { label: 'Anak', href: '/children', icon: Baby },
    { label: 'Posyandu', href: '/posyandu', icon: Building2 },
    { label: 'Ekspor', href: '/export', icon: Download },
    { label: 'Log Akses', href: '/admin/audit', icon: Shield },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ],
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  [ROLES.KADER]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ROLES.BIDAN]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ROLES.TPG]: 'bg-green-100 text-green-700 border-green-200',
  [ROLES.KEPALA]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ROLES.DINAS]: 'bg-red-100 text-red-700 border-red-200',
  [ROLES.ADMIN]: 'bg-gray-100 text-gray-700 border-gray-200',
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

function getNavItems(role: UserRole | null): NavItem[] {
  if (!role) return []
  return NAV_ITEMS_BY_ROLE[role] ?? []
}

interface SidebarContentProps {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
}

function SidebarContent({ collapsed, onToggle, onNavigate }: Readonly<SidebarContentProps>) {
  const pathname = usePathname()
  const { profile, role } = useUser()
  const navItems = getNavItems(role)

  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : ''
  const roleBadgeClass = role ? (ROLE_BADGE_COLORS[role] ?? ROLE_BADGE_COLORS[ROLES.ADMIN]) : ''

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        {/* Logo area */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-gray-100 px-4 shrink-0',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 shadow-sm group-hover:bg-green-700 transition-colors">
                <Leaf className="h-4 w-4 text-white" strokeWidth={1.75} />
              </div>
              <span className="font-bold text-gray-900 text-sm tracking-tight">PosyanduDigital</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 shadow-sm hover:bg-green-700 transition-colors">
                <Leaf className="h-4 w-4 text-white" strokeWidth={1.75} />
              </div>
            </Link>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard/kader' &&
                item.href !== '/dashboard/bidan' &&
                item.href !== '/dashboard/tpg' &&
                item.href !== '/dashboard/kepala' &&
                item.href !== '/dashboard/dinas' &&
                pathname.startsWith(item.href)) ||
              pathname === item.href

            const linkClass = cn(
              'flex items-center rounded-lg text-sm font-medium transition-all duration-150',
              collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5 w-full',
              isActive
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} className={linkClass} onClick={onNavigate}>
                      <item.icon
                        className={cn('h-5 w-5 shrink-0', isActive ? 'text-green-600' : 'text-gray-500')}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link key={item.href} href={item.href} className={linkClass} onClick={onNavigate}>
                <item.icon
                  className={cn('h-5 w-5 shrink-0', isActive ? 'text-green-600' : 'text-gray-400')}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                {item.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer — user role badge */}
        <div
          className={cn(
            'shrink-0 border-t border-gray-100 p-3',
            collapsed ? 'flex justify-center' : ''
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border',
                    roleBadgeClass
                  )}
                >
                  {profile?.nama?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{profile?.nama ?? 'Pengguna'}</p>
                <p className="text-xs opacity-75">{roleLabel}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 px-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border shrink-0',
                  roleBadgeClass
                )}
              >
                {profile?.nama?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.nama ?? 'Pengguna'}
                </p>
                <p
                  className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase mt-0.5',
                    roleBadgeClass
                  )}
                >
                  {roleLabel}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Mobile trigger button (exported for use in Header)
export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9 text-gray-600"
        onClick={() => setOpen(true)}
        aria-label="Buka menu navigasi"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r border-gray-100">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi</SheetTitle>
          </SheetHeader>
          <SidebarContent
            collapsed={false}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

// Desktop sidebar
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
  }, [])

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-gray-100 bg-white shrink-0 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={handleToggle} />
    </aside>
  )
}
