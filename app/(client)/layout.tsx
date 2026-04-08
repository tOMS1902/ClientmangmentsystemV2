'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useKeyInit } from '@/hooks/useKeyInit'

const navLinks = [
  { href: '/portal', label: 'Home' },
  { href: '/portal/checkin', label: 'Check-In' },
  { href: '/portal/checkin/midweek', label: 'Midweek' },
  { href: '/portal/meals', label: 'Meals' },
  { href: '/portal/progress', label: 'Progress' },
  { href: '/portal/programme', label: 'Training' },
  { href: '/portal/photos', label: 'Photos' },
  { href: '/portal/messages', label: 'Messages' },
  { href: '/portal/settings', label: 'Settings' },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  useKeyInit()

  // Find the best matching nav link for the current path
  const activeHref =
    navLinks.find(l => l.href === pathname)?.href ||
    navLinks.find(l => l.href !== '/portal' && pathname.startsWith(l.href))?.href ||
    '/portal'

  async function handleSignOut() {
    const supabase = createClientSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Top nav bar */}
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

      {/* Mobile dropdown nav — same style as coach tab dropdown */}
      <div className="sm:hidden bg-navy-mid border-b border-white/8 px-4 py-2">
        <select
          value={activeHref}
          onChange={e => router.push(e.target.value)}
          className="w-full bg-navy-deep border border-white/20 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {navLinks.map(link => (
            <option key={link.href} value={link.href}>{link.label}</option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <main className="max-w-[860px] mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
