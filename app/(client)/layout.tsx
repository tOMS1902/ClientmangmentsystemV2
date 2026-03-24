'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useKeyInit } from '@/hooks/useKeyInit'

const navLinks = [
  { href: '/portal', label: 'Home' },
  { href: '/portal/log', label: 'Log' },
  { href: '/portal/checkin', label: 'Check-In' },
  { href: '/portal/programme', label: 'Programme' },
  { href: '/portal/meals', label: 'Meals' },
  { href: '/portal/progress', label: 'Progress' },
  { href: '/portal/messages', label: 'Messages' },
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
      <nav className="bg-navy-mid border-b border-white/8">
        <div className="max-w-[860px] mx-auto px-4 flex items-center justify-between h-14">
          <div className="text-xl text-gold" style={{ fontFamily: 'var(--font-display)' }}>LE</div>
          <div className="flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-white/70 hover:text-white'
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
        </div>
      </nav>
      <main className="max-w-[860px] mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
