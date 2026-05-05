'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import type { ActivityItem } from '@/app/api/coach/activity/route'

const LIMIT = 50

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
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
  if (item.type === 'weekly_checkin') return `${first} submitted Week ${item.week_number} check-in`
  if (item.type === 'midweek_check') return `${first} submitted midweek check`
  return `${first} sent you a message`
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  async function fetchPage(pageOffset: number, append: boolean) {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await fetch(`/api/coach/activity?limit=${LIMIT}&offset=${pageOffset}`)
      if (res.ok) {
        const data = await res.json()
        const newItems: ActivityItem[] = data.items ?? []
        setTotal(data.total ?? 0)
        setItems(prev => append ? [...prev, ...newItems] : newItems)
        setOffset(pageOffset + newItems.length)
      }
    } catch { /* ignore */ }
    if (append) setLoadingMore(false)
    else setLoading(false)
  }

  useEffect(() => { fetchPage(0, false) }, [])

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Eyebrow>Notifications</Eyebrow>
        <GoldRule className="mb-4" />
        <h1 className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
          All Notifications
        </h1>
      </div>

      {loading ? (
        <p className="text-grey-muted text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-grey-muted text-sm">No notifications in the last 14 days.</p>
      ) : (
        <div className="bg-navy-card border border-white/8 flex flex-col divide-y divide-white/6">
          {items.map(item => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => router.push(`/clients/${item.client_id}`)}
              className="flex items-center gap-4 py-4 px-5 hover:bg-white/4 transition-colors text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-navy-mid border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white/70" style={{ fontFamily: 'var(--font-label)' }}>
                  {initials(item.client_name)}
                </span>
              </div>
              <p className="flex-1 text-sm text-white/85 leading-tight">{itemLabel(item)}</p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-grey-muted">{relativeTime(item.created_at)}</span>
                <span className="text-grey-muted">→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && offset < total && (
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => fetchPage(offset, true)} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  )
}
