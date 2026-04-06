'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const BADGES = [
  { key: 'first_month', label: 'First Month Complete' },
  { key: 'first_5kg', label: 'First 5kg Lost' },
  { key: 'first_race', label: 'First Race Completed' },
  { key: 'vo2_improved', label: 'VO2 Max Improved' },
  { key: 'bloodwork_optimised', label: 'Bloodwork Optimised' },
]

interface ClientPortalManagerProps {
  clientId: string
  weekNumber: number
  initialGoalEventName?: string | null
  initialGoalEventDate?: string | null
  initialWelcomeVideoUrl?: string | null
  initialBadges: string[]
}

export function ClientPortalManager({
  clientId,
  weekNumber,
  initialGoalEventName,
  initialGoalEventDate,
  initialWelcomeVideoUrl,
  initialBadges,
}: ClientPortalManagerProps) {
  const [loomUrl, setLoomUrl] = useState('')
  const [loomSaving, setLoomSaving] = useState(false)
  const [loomMsg, setLoomMsg] = useState('')

  const [goalEventName, setGoalEventName] = useState(initialGoalEventName ?? '')
  const [goalEventDate, setGoalEventDate] = useState(initialGoalEventDate ?? '')
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalMsg, setGoalMsg] = useState('')

  const [welcomeUrl, setWelcomeUrl] = useState(initialWelcomeVideoUrl ?? '')
  const [welcomeSaving, setWelcomeSaving] = useState(false)
  const [welcomeMsg, setWelcomeMsg] = useState('')

  const [awardedBadges, setAwardedBadges] = useState<string[]>(initialBadges)
  const [badgeSaving, setBadgeSaving] = useState<string | null>(null)

  async function saveLoom() {
    if (!loomUrl.trim()) return
    setLoomSaving(true)
    setLoomMsg('')
    try {
      const res = await fetch(`/api/loom-video/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loom_url: loomUrl.trim(), week_number: weekNumber }),
      })
      if (res.ok) {
        setLoomMsg('Video posted')
        setLoomUrl('')
        setTimeout(() => setLoomMsg(''), 3000)
      } else {
        setLoomMsg('Failed to save')
      }
    } catch { setLoomMsg('Error') }
    setLoomSaving(false)
  }

  async function saveGoal() {
    setGoalSaving(true)
    setGoalMsg('')
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_event_name: goalEventName || null, goal_event_date: goalEventDate || null }),
      })
      if (res.ok) {
        setGoalMsg('Saved')
        setTimeout(() => setGoalMsg(''), 2000)
      } else {
        setGoalMsg('Failed')
      }
    } catch { setGoalMsg('Error') }
    setGoalSaving(false)
  }

  async function saveWelcome() {
    setWelcomeSaving(true)
    setWelcomeMsg('')
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcome_video_url: welcomeUrl || null }),
      })
      if (res.ok) {
        setWelcomeMsg('Saved')
        setTimeout(() => setWelcomeMsg(''), 2000)
      } else {
        setWelcomeMsg('Failed')
      }
    } catch { setWelcomeMsg('Error') }
    setWelcomeSaving(false)
  }

  async function awardBadge(key: string) {
    setBadgeSaving(key)
    const res = await fetch(`/api/badges/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badge_key: key }),
    })
    if (res.ok) setAwardedBadges(prev => [...prev, key])
    setBadgeSaving(null)
  }

  async function revokeBadge(key: string) {
    setBadgeSaving(key)
    const res = await fetch(`/api/badges/${clientId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badge_key: key }),
    })
    if (res.ok) setAwardedBadges(prev => prev.filter(k => k !== key))
    setBadgeSaving(null)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Weekly Loom Video */}
      <div>
        <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>WEEKLY VIDEO (WEEK {weekNumber})</p>
        <p className="text-grey-muted text-xs mb-3">Paste a Loom URL — it appears instantly on the client&apos;s dashboard.</p>
        <div className="flex gap-3">
          <input
            type="url"
            value={loomUrl}
            onChange={e => setLoomUrl(e.target.value)}
            placeholder="https://www.loom.com/share/..."
            className="flex-1 bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <Button size="sm" onClick={saveLoom} disabled={loomSaving || !loomUrl.trim()}>
            {loomSaving ? 'Posting...' : 'Post Video'}
          </Button>
        </div>
        {loomMsg && <p className="text-xs text-grey-muted mt-2">{loomMsg}</p>}
      </div>

      {/* Goal Event */}
      <div>
        <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>GOAL / EVENT COUNTDOWN</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={goalEventName}
            onChange={e => setGoalEventName(e.target.value)}
            placeholder="e.g. Cork Half Marathon"
            className="bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="date"
            value={goalEventDate}
            onChange={e => setGoalEventDate(e.target.value)}
            className="bg-navy-deep border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveGoal} disabled={goalSaving}>
            {goalSaving ? 'Saving...' : 'Save Event'}
          </Button>
          {goalMsg && <span className="text-xs text-grey-muted">{goalMsg}</span>}
        </div>
      </div>

      {/* Welcome Video */}
      <div>
        <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>WELCOME VIDEO</p>
        <p className="text-grey-muted text-xs mb-3">Pinned to top of client&apos;s dashboard on first login. Disappears after 2 views.</p>
        <div className="flex gap-3">
          <input
            type="url"
            value={welcomeUrl}
            onChange={e => setWelcomeUrl(e.target.value)}
            placeholder="https://www.loom.com/share/..."
            className="flex-1 bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <Button size="sm" onClick={saveWelcome} disabled={welcomeSaving}>
            {welcomeSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        {welcomeMsg && <p className="text-xs text-grey-muted mt-2">{welcomeMsg}</p>}
      </div>

      {/* Badges */}
      <div>
        <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>MILESTONE BADGES</p>
        <div className="flex flex-col gap-2">
          {BADGES.map(badge => {
            const awarded = awardedBadges.includes(badge.key)
            const saving = badgeSaving === badge.key
            return (
              <div key={badge.key} className="flex items-center justify-between bg-navy-deep border border-white/8 px-4 py-3">
                <div className="flex items-center gap-3">
                  {awarded && <span className="text-gold text-sm">&#x2713;</span>}
                  <span className={`text-sm ${awarded ? 'text-white' : 'text-grey-muted'}`}>{badge.label}</span>
                </div>
                {awarded ? (
                  <button
                    onClick={() => revokeBadge(badge.key)}
                    disabled={saving}
                    className="text-xs text-grey-muted hover:text-red-400 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    {saving ? '...' : 'Revoke'}
                  </button>
                ) : (
                  <button
                    onClick={() => awardBadge(badge.key)}
                    disabled={saving}
                    className="text-xs text-gold hover:text-gold/80 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    {saving ? '...' : 'Award'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
