'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut, X } from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface CoachSidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export function CoachSidebar({ mobileOpen = false, onClose }: CoachSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClientSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className={`
      fixed md:relative inset-y-0 left-0 z-50
      w-60 min-h-screen bg-navy-mid flex flex-col flex-shrink-0
      transition-transform duration-200
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/8 flex items-start justify-between">
        <div>
          <div className="text-2xl text-gold mb-1" style={{ fontFamily: 'var(--font-display)' }}>LE</div>
          <div className="text-sm text-white/85">The Legal Edge</div>
          <div className="text-xs text-grey-muted mt-0.5">Coach Portal</div>
        </div>
        <button
          className="md:hidden text-grey-muted hover:text-white transition-colors mt-1"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'text-gold border-l-2 border-gold pl-[10px]'
                  : 'text-white/70 hover:text-white border-l-2 border-transparent pl-[10px]'
              }`}
              style={{ fontFamily: 'var(--font-label)' }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Coach profile + sign out */}
      <div className="px-6 py-5 border-t border-white/8 flex items-center gap-3">
        <div
          className="w-9 h-9 border border-gold flex items-center justify-center text-xs text-gold flex-shrink-0"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          CF
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/85">Calum Fraser</div>
          <div className="text-xs text-grey-muted">Coach</div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-grey-muted hover:text-white transition-colors flex-shrink-0"
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
