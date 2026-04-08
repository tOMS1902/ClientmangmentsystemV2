'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { ActivityItem } from '@/app/api/coach/activity/route'

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
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

function itemLabel(item: ActivityItem): string {
  const first = item.client_name.split(' ')[0]
  if (item.type === 'weekly_checkin') {
    return `${first} submitted Week ${item.week_number} check-in`
  }
  if (item.type === 'midweek_check') {
    return `${first} submitted midweek check`
  }
  return `${first} sent you a message`
}

function typeIcon(type: ActivityItem['type']) {
  if (type === 'weekly_checkin') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    )
  }
  if (type === 'midweek_check') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
      </svg>
    )
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  )
}

export function ActivityFeed() {
  const router = useRouter()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/activity')
      if (res.ok) setItems(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchActivity()

    const supabase = createClientSupabaseClient()

    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weekly_checkins' }, fetchActivity)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'midweek_checks' }, fetchActivity)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchActivity)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchActivity])

  if (loading) {
    return <div className="text-grey-muted text-sm py-4">Loading activity...</div>
  }

  if (items.length === 0) {
    return (
      <div className="bg-navy-card border border-white/8 p-5 text-center">
        <p className="text-grey-muted text-sm">No recent activity in the last 14 days.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-white/6">
      {items.slice(0, 10).map(item => (
        <button
          key={`${item.type}-${item.id}`}
          type="button"
          onClick={() => router.push(`/clients/${item.client_id}`)}
          className="flex items-center gap-3 py-3 px-4 hover:bg-white/4 transition-colors text-left w-full"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-navy-mid border border-white/10 flex items-center justify-center">
              <span className="text-xs text-white/70" style={{ fontFamily: 'var(--font-label)' }}>
                {initials(item.client_name)}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-navy-deep border border-navy-deep flex items-center justify-center">
              {typeIcon(item.type)}
            </span>
          </div>

          {/* Label */}
          <p className="flex-1 text-sm text-white/85 leading-tight">{itemLabel(item)}</p>

          {/* Time */}
          <span className="text-xs text-grey-muted flex-shrink-0">{relativeTime(item.created_at)}</span>
        </button>
      ))}
    </div>
  )
}
