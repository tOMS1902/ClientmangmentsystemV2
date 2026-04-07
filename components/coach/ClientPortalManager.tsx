'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface Goal {
  id: string
  event_name: string
  event_date: string
}

interface ClientPortalManagerProps {
  clientId: string
  weekNumber: number
  initialWelcomeVideoUrl?: string | null
  initialBadges: string[]
}

export function ClientPortalManager({
  clientId,
  weekNumber,
  initialWelcomeVideoUrl,
  initialBadges,
}: ClientPortalManagerProps) {
  const [loomUrl, setLoomUrl] = useState('')
  const [loomSaving, setLoomSaving] = useState(false)
  const [loomMsg, setLoomMsg] = useState('')

  const [welcomeUrl, setWelcomeUrl] = useState(initialWelcomeVideoUrl ?? '')
  const [welcomeSaving, setWelcomeSaving] = useState(false)
  const [welcomeMsg, setWelcomeMsg] = useState('')

  // Goals
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalName, setGoalName] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalMsg, setGoalMsg] = useState('')

  // Badges
  const [awardedBadges, setAwardedBadges] = useState<string[]>(initialBadges)
  const [badgeSaving, setBadgeSaving] = useState<string | null>(null)
  const [newBadgeLabel, setNewBadgeLabel] = useState('')
  const [badgeMsg, setBadgeMsg] = useState('')

  useEffect(() => {
    fetch(`/api/goals/${clientId}`)
      .then(r => r.json())
      .then(data => setGoals(data.goals ?? []))
      .catch(() => {})
  }, [clientId])

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

  async function addGoal() {
    if (!goalName.trim() || !goalDate) return
    setGoalSaving(true)
    setGoalMsg('')
    const res = await fetch(`/api/goals/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: goalName, event_date: goalDate }),
    })
    if (res.ok) {
      const data = await res.json()
      setGoals(prev => [...prev, data.goal])
      setGoalName('')
      setGoalDate('')
      setGoalMsg('Saved')
      setTimeout(() => setGoalMsg(''), 2000)
    } else {
      setGoalMsg('Failed')
    }
    setGoalSaving(false)
  }

  async function deleteGoal(goalId: string) {
    const res = await fetch(`/api/goals/${clientId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId }),
    })
    if (res.ok) setGoals(prev => prev.filter(g => g.id !== goalId))
  }

  async function addBadge() {
    const label = newBadgeLabel.trim()
    if (!label || awardedBadges.includes(label)) return
    setBadgeSaving(label)
    setBadgeMsg('')
    const res = await fetch(`/api/badges/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badge_key: label }),
    })
    if (res.ok) {
      setAwardedBadges(prev => [...prev, label])
      setNewBadgeLabel('')
    } else {
      setBadgeMsg('Failed to add')
      setTimeout(() => setBadgeMsg(''), 2000)
    }
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

      {/* Goal Events */}
      <div>
        <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>GOAL EVENTS</p>

        {/* Existing goals list */}
        {goals.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {goals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between bg-navy-deep border border-white/8 px-4 py-3">
                <div>
                  <p className="text-white text-sm">{goal.event_name}</p>
                  <p className="text-grey-muted text-xs">
                    {new Date(goal.event_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-xs text-grey-muted hover:text-red-400 transition-colors"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add goal form */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={goalName}
            onChange={e => setGoalName(e.target.value)}
            placeholder="e.g. Cork Half Marathon"
            className="bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="date"
            value={goalDate}
            onChange={e => setGoalDate(e.target.value)}
            className="bg-navy-deep border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={addGoal} disabled={goalSaving || !goalName.trim() || !goalDate}>
            {goalSaving ? 'Saving...' : 'Add Goal'}
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

      {/* Milestone Badges */}
      <div>
        <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>MILESTONE BADGES</p>

        {/* Awarded badges */}
        {awardedBadges.length > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {awardedBadges.map(key => (
              <div key={key} className="flex items-center justify-between bg-navy-deep border border-white/8 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-gold text-sm">&#x2713;</span>
                  <span className="text-white text-sm">{key}</span>
                </div>
                <button
                  onClick={() => revokeBadge(key)}
                  disabled={badgeSaving === key}
                  className="text-xs text-grey-muted hover:text-red-400 transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {badgeSaving === key ? '...' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-grey-muted text-xs mb-4">No milestones awarded yet.</p>
        )}

        {/* Add badge form */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newBadgeLabel}
            onChange={e => setNewBadgeLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addBadge()}
            placeholder="e.g. First 5kg Lost"
            className="flex-1 bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <Button size="sm" onClick={addBadge} disabled={!!badgeSaving || !newBadgeLabel.trim()}>
            {badgeSaving ? '...' : 'Add Badge'}
          </Button>
        </div>
        {badgeMsg && <p className="text-xs text-grey-muted mt-2">{badgeMsg}</p>}
      </div>

    </div>
  )
}
