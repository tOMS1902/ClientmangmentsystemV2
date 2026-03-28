'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useKeyInit } from '@/hooks/useKeyInit'
import { Home, BookOpen, ClipboardList, Utensils, TrendingUp, MessageCircle, Camera } from 'lucide-react'

const navLinks = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/log', label: 'Log', icon: BookOpen },
  { href: '/portal/checkin', label: 'Check-In', icon: ClipboardList },
  { href: '/portal/meals', label: 'Meals', icon: Utensils },
  { href: '/portal/progress', label: 'Progress', icon: TrendingUp },
  { href: '/portal/photos', label: 'Photos', icon: Camera },
  { href: '/portal/messages', label: 'Messages', icon: MessageCircle },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  useKeyInit()

  async function handleSignOut() {
    const supabase = createClientSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Top nav */}
      <nav className="bg-navy-mid border-b border-white/8">
        <div className="max-w-[860px] mx-auto px-4 flex items-center justify-between h-14">
          <div className="text-xl text-gold" style={{ fontFamily: 'var(--font-display)' }}>LE</div>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    isActive ? 'text-gold border-b-2 border-gold' : 'text-white/70 hover:text-white'
                  }`}
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {link.label}
                </Link>
              )
            })}
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors ml-2"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Sign Out
            </button>
          </div>

          {/* Mobile sign out */}
          <button
            onClick={handleSignOut}
            className="sm:hidden text-xs text-white/50 hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-navy-mid border-t border-white/8 z-50 flex h-16">
        {navLinks.map(link => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-gold' : 'text-white/40 active:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px]" style={{ fontFamily: 'var(--font-label)' }}>
                {link.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Main content — extra bottom padding on mobile for tab bar */}
      <main className="max-w-[860px] mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
