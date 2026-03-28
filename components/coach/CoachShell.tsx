'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { CoachSidebar } from './CoachSidebar'
import { KeyInitializer } from '@/components/KeyInitializer'

interface CoachShellProps {
  children: React.ReactNode
  today: string
}

export function CoachShell({ children, today }: CoachShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-navy-deep">
      <KeyInitializer />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <CoachSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 md:px-8 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3 md:hidden">
            <button
              className="text-white/70 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span className="text-xl text-gold" style={{ fontFamily: 'var(--font-display)' }}>LE</span>
          </div>
          <span className="text-sm text-grey-muted">{today}</span>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
