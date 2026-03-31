'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { ProgressPhotoUpload } from '@/components/photos/ProgressPhotoUpload'
import type { WeeklyCheckin } from '@/lib/types'

function Field({
  number,
  label,
  hint,
  children,
}: {
  number: number
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block mb-1">
        <span className="text-gold text-xs mr-2" style={{ fontFamily: 'var(--font-label)' }}>{number}.</span>
        <span className="text-white/85 text-sm">{label}</span>
        {hint && <span className="text-grey-muted text-xs ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function Textarea({ value, onChange, placeholder, required = true }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      rows={3}
      placeholder={placeholder}
      className="w-full bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
    />
  )
}

export default function CheckInPage() {
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submittedCheckinId, setSubmittedCheckinId] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)

  // Form state — mirrors all 13 questions
  const [weight, setWeight] = useState('')
  const [weekSummary, setWeekSummary] = useState('')
  const [dietSummary, setDietSummary] = useState('')
  const [trainingSessions, setTrainingSessions] = useState('')
  const [energySummary, setEnergySummary] = useState('')
  const [sleepSummary, setSleepSummary] = useState('')
  const [biggestWin, setBiggestWin] = useState('')
  const [mainChallenge, setMainChallenge] = useState('')
  const [focusNextWeek, setFocusNextWeek] = useState('')
  const [improveNextWeek, setImproveNextWeek] = useState('')
  const [coachSupport, setCoachSupport] = useState('')
  const [avgSteps, setAvgSteps] = useState('')
  const [anythingElse, setAnythingElse] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/checkins/me')
        if (res.ok) setCheckins(await res.json() || [])
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const thisWeekCheckin = checkins.find(c => {
    const diff = (Date.now() - new Date(c.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: parseFloat(weight),
        week_summary: weekSummary,
        diet_summary: dietSummary,
        training_sessions: trainingSessions,
        energy_summary: energySummary,
        sleep_summary: sleepSummary,
        biggest_win: biggestWin,
        main_challenge: mainChallenge,
        focus_next_week: focusNextWeek,
        improve_next_week: improveNextWeek,
        coach_support: coachSupport,
        avg_steps: avgSteps,
        anything_else: anythingElse || null,
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
            <ProgressPhotoUpload clientId={clientId} weekNumber={checkins.length} checkInId={submittedCheckinId} />
          </div>
        )}

        {checkins.length > 0 && (
          <div>
            <Eyebrow>Previous Check-Ins</Eyebrow>
            <GoldRule />
            <div className="flex flex-col gap-4 mt-4">
              {checkins.map(c => (
                <details key={c.id} className="bg-navy-card border border-white/8">
                  <summary className="p-4 cursor-pointer flex items-center justify-between">
                    <span className="text-white" style={{ fontFamily: 'var(--font-display)' }}>Week {c.week_number}</span>
                    <span className="text-grey-muted text-sm">
                      {new Date(c.check_in_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long' })}
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <GoldRule />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
                      {[
                        { label: 'Weight', value: `${c.weight}kg` },
                        { label: 'Week Summary', value: c.week_summary },
                        { label: 'Food', value: c.diet_summary },
                        { label: 'Training Sessions', value: c.training_sessions },
                        { label: 'Energy', value: c.energy_summary },
                        { label: 'Sleep', value: c.sleep_summary },
                        { label: 'Biggest Win', value: c.biggest_win },
                        { label: 'Biggest Challenge', value: c.main_challenge },
                        { label: 'Focus Next Week', value: c.focus_next_week },
                        { label: 'Make Next Week Better', value: c.improve_next_week },
                        { label: 'Support Needed', value: c.coach_support },
                        { label: 'Avg Steps', value: c.avg_steps },
                      ].map(item => item.value ? (
                        <div key={item.label}>
                          <p className="text-grey-muted">{item.label}</p>
                          <p className="text-white">{item.value}</p>
                        </div>
                      ) : null)}
                      {c.anything_else && (
                        <div className="col-span-2">
                          <p className="text-grey-muted">Anything Else</p>
                          <p className="text-white">{c.anything_else}</p>
                        </div>
                      )}
                      {c.coach_notes && (
                        <div className="col-span-2 mt-2 pt-3 border-t border-white/8">
                          <p className="text-grey-muted text-xs mb-1">Coach Notes</p>
                          <p className="text-white/85">{c.coach_notes}</p>
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
        <GoldRule className="mt-3" />
      </div>

      <form onSubmit={e => { e.preventDefault(); setConfirmOpen(true) }} className="flex flex-col gap-5">

        <Field number={1} label="How was your week overall?" hint="What actually happened — keep it short">
          <Textarea value={weekSummary} onChange={setWeekSummary} placeholder="Give a brief overview of your week..." />
        </Field>

        <Field number={2} label="Current weight (kg)">
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            required
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </Field>

        <Field number={3} label="How did you get on with your food this week?" hint="Where did things go right/wrong — keep it brief">
          <Textarea value={dietSummary} onChange={setDietSummary} placeholder="How was your nutrition overall?" />
        </Field>

        <Field number={4} label="How many training sessions did you complete?" hint="Out of what was planned">
          <input
            type="text"
            value={trainingSessions}
            onChange={e => setTrainingSessions(e.target.value)}
            required
            placeholder="e.g. 3 out of 4"
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </Field>

        <Field number={5} label="How was your energy this week?" hint="Throughout the day + in the gym">
          <Textarea value={energySummary} onChange={setEnergySummary} placeholder="Energy levels day-to-day and during training..." />
        </Field>

        <Field number={6} label="How was your sleep this week?" hint="Hours + quality">
          <Textarea value={sleepSummary} onChange={setSleepSummary} placeholder="How many hours and how did you feel?" />
        </Field>

        <Field number={7} label="What was your biggest win this week?">
          <Textarea value={biggestWin} onChange={setBiggestWin} placeholder="What went really well?" />
        </Field>

        <Field number={8} label="What was your biggest challenge this week?">
          <Textarea value={mainChallenge} onChange={setMainChallenge} placeholder="What was the hardest part?" />
        </Field>

        <Field number={9} label="What needs the most focus going into next week?">
          <Textarea value={focusNextWeek} onChange={setFocusNextWeek} placeholder="What will you prioritise?" />
        </Field>

        <Field number={10} label="What can you do to make next week better?" hint="1–2 simple things">
          <Textarea value={improveNextWeek} onChange={setImproveNextWeek} placeholder="Specific actions you'll take..." />
        </Field>

        <Field number={11} label="Is there anything you need from me right now?" hint="Keep it short — support, changes, questions etc.">
          <Textarea value={coachSupport} onChange={setCoachSupport} placeholder="Anything you need from your coach?" />
        </Field>

        <Field number={12} label="Average daily steps" hint="if tracked">
          <input
            type="text"
            value={avgSteps}
            onChange={e => setAvgSteps(e.target.value)}
            required
            placeholder="e.g. 8,500 or N/A"
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </Field>

        <Field number={13} label="Anything else I should know?" hint="Optional">
          <Textarea value={anythingElse} onChange={setAnythingElse} placeholder="Anything else worth mentioning..." required={false} />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Submit Check-In
        </Button>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 p-6 max-w-sm w-full">
            <h3 className="text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Confirm Submission</h3>
            <p className="text-grey-muted text-sm mb-5">Once submitted, this cannot be edited. Continue?</p>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
