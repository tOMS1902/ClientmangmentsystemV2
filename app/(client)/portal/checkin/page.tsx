'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { ProgressPhotoUpload } from '@/components/photos/ProgressPhotoUpload'
import type { WeeklyCheckin } from '@/lib/types'

export default function CheckInPage() {
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const [weight, setWeight] = useState('')
  const [sleepSummary, setSleepSummary] = useState('')
  const [biggestWin, setBiggestWin] = useState('')
  const [dietSummary, setDietSummary] = useState('')
  const [mainChallenge, setMainChallenge] = useState('')
  const [focusNextWeek, setFocusNextWeek] = useState('')
  const [avgSteps, setAvgSteps] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedCheckinId, setSubmittedCheckinId] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // We need clientId — fetch client record first
      try {
        const profileRes = await fetch('/api/auth/me')
        // Since we don't have /api/auth/me, use the checkins endpoint with 'me' approach
        // Actually use the existing checkins endpoint — we need to know our clientId
        // For client portal, we can fetch via server — but this is client component
        // Use a workaround: fetch recent checkins, if 200 we have access
        const res = await fetch('/api/checkins/me')
        if (res.ok) {
          const data = await res.json()
          setCheckins(data || [])
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }
    load()
  }, [])

  const thisWeekCheckin = checkins.find(c => {
    const d = new Date(c.check_in_date)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: parseFloat(weight),
        sleep_summary: sleepSummary,
        biggest_win: biggestWin,
        diet_summary: dietSummary,
        main_challenge: mainChallenge,
        focus_next_week: focusNextWeek,
        avg_steps: avgSteps,
      }),
    })
    if (res.ok) {
      const newCheckin = await res.json()
      setCheckins([newCheckin, ...checkins])
      setSubmittedCheckinId(newCheckin.id)
      setClientId(newCheckin.client_id)
      setSubmitted(true)
    }
    setSubmitting(false)
    setConfirmOpen(false)
  }

  if (loading) return <div className="text-grey-muted">Loading...</div>

  if (thisWeekCheckin || submitted) {
    return (
      <div>
        <div className="mb-8">
          <Eyebrow>Check-In</Eyebrow>
          <GoldRule />
          <p className="text-white mt-4">Your check-in for this week has been submitted.</p>
          <p className="text-grey-muted text-sm mt-1">
            Next check-in: next {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IE', { weekday: 'long' })}
          </p>
        </div>

        {submittedCheckinId && clientId && (
          <div className="mb-8">
            <ProgressPhotoUpload
              clientId={clientId}
              weekNumber={checkins.length}
              checkInId={submittedCheckinId}
            />
          </div>
        )}

        {checkins.length > 0 && (
          <div>
            <Eyebrow>Previous Check-Ins</Eyebrow>
            <GoldRule />
            <div className="flex flex-col gap-4 mt-4">
              {checkins.map(checkin => (
                <details key={checkin.id} className="bg-navy-card border border-white/8">
                  <summary className="p-4 cursor-pointer flex items-center justify-between">
                    <span className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      Week {checkin.week_number}
                    </span>
                    <span className="text-grey-muted text-sm">
                      {new Date(checkin.check_in_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long' })}
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <GoldRule />
                    <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                      <div><p className="text-grey-muted">Weight</p><p className="text-white">{checkin.weight}kg</p></div>
                      <div><p className="text-grey-muted">Avg Steps</p><p className="text-white">{checkin.avg_steps}</p></div>
                      <div><p className="text-grey-muted">Biggest Win</p><p className="text-white">{checkin.biggest_win}</p></div>
                      <div><p className="text-grey-muted">Diet Summary</p><p className="text-white">{checkin.diet_summary}</p></div>
                      <div><p className="text-grey-muted">Sleep Summary</p><p className="text-white">{checkin.sleep_summary}</p></div>
                      <div><p className="text-grey-muted">Main Challenge</p><p className="text-white">{checkin.main_challenge}</p></div>
                      <div className="col-span-2"><p className="text-grey-muted">Focus Next Week</p><p className="text-white">{checkin.focus_next_week}</p></div>
                      {checkin.coach_notes && (
                        <div className="col-span-2 mt-2 pt-3 border-t border-white/8">
                          <p className="text-grey-muted text-xs mb-1">Coach Notes</p>
                          <p className="text-white/85 text-sm">{checkin.coach_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Eyebrow>Weekly Check-In</Eyebrow>
        <h1 className="text-3xl text-white mt-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Weekly Check-In
        </h1>
        <p className="text-grey-muted text-sm">How was your week?</p>
        <GoldRule className="mt-3" />
      </div>

      <form onSubmit={e => { e.preventDefault(); setConfirmOpen(true) }} className="flex flex-col gap-5">
        <div>
          <label className="text-sm text-white/85 block mb-1">Current Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            required
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </div>

        {[
          { label: 'Sleep Summary', value: sleepSummary, setter: setSleepSummary, placeholder: 'How did you sleep this week?' },
          { label: 'Biggest Win', value: biggestWin, setter: setBiggestWin, placeholder: "What went really well?" },
          { label: 'Diet Summary', value: dietSummary, setter: setDietSummary, placeholder: 'How was your nutrition overall?' },
          { label: 'Main Challenge', value: mainChallenge, setter: setMainChallenge, placeholder: 'What was the hardest part?' },
          { label: 'Focus for Next Week', value: focusNextWeek, setter: setFocusNextWeek, placeholder: 'What will you prioritise next week?' },
        ].map(field => (
          <div key={field.label}>
            <label className="text-sm text-white/85 block mb-1">{field.label}</label>
            <textarea
              value={field.value}
              onChange={e => field.setter(e.target.value)}
              required
              rows={3}
              placeholder={field.placeholder}
              className="w-full bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>
        ))}

        <div>
          <label className="text-sm text-white/85 block mb-1">Average Daily Steps</label>
          <input
            type="text"
            value={avgSteps}
            onChange={e => setAvgSteps(e.target.value)}
            required
            placeholder="e.g. 8,500"
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Submit Check-In
        </Button>
      </form>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 p-6 max-w-sm w-full">
            <h3 className="text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Confirm Submission
            </h3>
            <p className="text-grey-muted text-sm mb-5">
              Once submitted, this cannot be edited. Continue?
            </p>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
