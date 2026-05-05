'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useKeyInit } from '@/hooks/useKeyInit'

interface PortalNotification {
  id: string
  message: string
  created_at: string
  is_read: boolean
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 2) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const BASE_LINKS = [
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

export function ClientPortalNav({ showReports, showMidweek, showPhotos }: { showReports: boolean; showMidweek: boolean; showPhotos: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  useKeyInit()

  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setUnreadCount(data.unread_count ?? 0)
        setNotifications(data.notifications ?? [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function openBell() {
    setBellOpen(v => !v)
    const unread = notifications.filter(n => !n.is_read)
    if (unread.length === 0) return
    await fetch('/api/notifications/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unread.map(n => n.id) }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const navLinks = BASE_LINKS
    .filter(l => l.href !== '/portal/checkin/midweek' || showMidweek)
    .filter(l => l.href !== '/portal/photos' || showPhotos)
    .concat(showReports ? [{ href: '/portal/reports', label: 'Reports' }] : [])

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
    <>
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
            {/* Notification bell */}
            <div ref={bellRef} className="relative ml-1">
              <button
                onClick={openBell}
                className="relative p-2 text-white/60 hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gold" />
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-navy-mid border border-white/12 z-50 shadow-xl">
                  <p className="text-xs text-grey-muted px-4 py-3 border-b border-white/8" style={{ fontFamily: 'var(--font-label)' }}>
                    NOTIFICATIONS
                  </p>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-grey-muted px-4 py-4">No notifications yet.</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-white/6 max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? 'text-white/50' : 'text-white/85'}`}>
                          <p className="leading-snug">{n.message}</p>
                          <p className="text-xs text-grey-muted mt-1">{relativeTime(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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

      {/* Mobile dropdown nav */}
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
    </>
  )
}
