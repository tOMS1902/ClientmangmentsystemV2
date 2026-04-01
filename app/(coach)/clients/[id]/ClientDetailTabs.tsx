'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { SparkLine } from '@/components/ui/SparkLine'
import { ProgrammeEditor } from '@/components/coach/ProgrammeEditor'
import { NutritionTargetsForm } from '@/components/coach/NutritionTargetsForm'
import { MealPlanBuilder } from '@/components/coach/MealPlanBuilder'
import { HabitManager } from '@/components/coach/HabitManager'
import { SupplementsEditor } from '@/components/coach/SupplementsEditor'
import { MessagingTab } from '@/components/coach/MessagingTab'
import { PhotosTab } from '@/components/client/tabs/PhotosTab'
import type { Client, WeeklyCheckin, MidweekCheck, Programme, NutritionTargets, Habit, MealPlan, Supplement, TrackingStatus } from '@/lib/types'

interface ClientDetailTabsProps {
  client: Client
  checkins: WeeklyCheckin[]
  midweekChecks: MidweekCheck[]
  programmes: Programme[]
  targets: NutritionTargets | null
  habits: Habit[]
  trainingMealPlan: MealPlan | null
  restMealPlan: MealPlan | null
  supplements: Supplement[]
  weekNumber: number
  unreadMessages?: number
}

type Tab = 'overview' | 'midweek' | 'checkins' | 'training' | 'nutrition' | 'onboarding' | 'messages' | 'photos'

const ONBOARDING_SECTIONS = [
  {
    title: 'Training',
    fields: [
      { key: 'full_name', label: 'Full Name' },
      { key: 'activity_days', label: 'Activity Level (days/week)' },
      { key: 'training_experience', label: 'Training Experience' },
      { key: 'training_days', label: 'Training Days Available' },
      { key: 'preferred_time', label: 'Preferred Training Time' },
      { key: 'preferred_style', label: 'Preferred Style' },
      { key: 'workout_structure', label: 'Workout Structure' },
      { key: 'mobility_prehab', label: 'Mobility / Prehab' },
      { key: 'avoid_exercises', label: 'Exercises / Equipment to Avoid', wide: true },
      { key: 'injuries', label: 'Injuries / Limitations', wide: true },
      { key: 'priority_areas', label: 'Areas to Prioritise', wide: true },
      { key: 'strength_goals', label: 'Specific Strength Goals', wide: true },
      { key: 'previous_programmes', label: 'Previous Programmes', wide: true },
    ],
  },
  {
    title: 'Nutrition',
    fields: [
      { key: 'weight_kg', label: 'Weight (kg)' },
      { key: 'age', label: 'Age' },
      { key: 'height', label: 'Height' },
      { key: 'daily_steps', label: 'Daily Steps' },
      { key: 'meals_per_day', label: 'Meals Per Day' },
      { key: 'meal_prep_time', label: 'Meal Prep Time' },
      { key: 'calorie_tracking', label: 'Calorie Tracking' },
      { key: 'primary_goals', label: 'Primary Goals', wide: true },
      { key: 'motivation', label: 'What Motivates Them', wide: true },
      { key: 'fat_loss_history', label: 'Past Success with Fat/Weight Loss', wide: true },
      { key: 'food_allergies', label: 'Food Allergies / Intolerances', wide: true },
      { key: 'foods_avoided', label: 'Foods to Avoid', wide: true },
      { key: 'foods_wanted', label: 'Foods to Include', wide: true },
      { key: 'typical_eating', label: 'Typical Day of Eating', wide: true },
      { key: 'training_fasted', label: 'Training / Fasted Preference', wide: true },
      { key: 'food_relationship', label: 'Relationship with Food', wide: true },
      { key: 'medical_conditions', label: 'Medical Conditions', wide: true },
    ],
  },
  {
    title: 'Lifestyle',
    fields: [
      { key: 'work_week', label: 'Work Week Type' },
      { key: 'wake_time', label: 'Wake-Up Time' },
      { key: 'work_start', label: 'Work Start' },
      { key: 'work_finish', label: 'Work Finish' },
      { key: 'bedtime', label: 'Bedtime' },
      { key: 'peak_energy', label: 'Peak Energy Window' },
      { key: 'energy_crash', label: 'Energy Crash Time' },
      { key: 'wearable', label: 'Wearable / HRV' },
      { key: 'sleep_hours', label: 'Sleep Hours' },
      { key: 'phone_in_bed', label: 'Phone in Bed' },
      { key: 'weekends_routine', label: 'Weekends Derail Routine' },
      { key: 'alcohol_frequency', label: 'Alcohol Frequency' },
      { key: 'work_travel', label: 'Work Travel' },
      { key: 'stress_triggers', label: 'Stress Triggers', wide: true },
      { key: 'stress_response', label: 'Stress Response', wide: true },
    ],
  },
]

function statusLabel(v: TrackingStatus) {
  if (v === 'yes') return 'On track'
  if (v === 'slightly_off') return 'Slightly off'
  return 'Off track'
}
function statusColor(v: TrackingStatus) {
  if (v === 'yes') return 'text-green-400'
  if (v === 'slightly_off') return 'text-amber-400'
  return 'text-red-400'
}

function OverviewTab({ client, checkins, weekNumber }: Pick<ClientDetailTabsProps, 'client' | 'checkins' | 'weekNumber'>) {
  const latestCheckin = checkins[0] || null
  const [goalWeight, setGoalWeight] = useState(client.goal_weight || 0)
  const [startWeight, setStartWeight] = useState(client.start_weight || 0)
  const [editingWeights, setEditingWeights] = useState(false)
  const [savingWeights, setSavingWeights] = useState(false)
  const [weightMsg, setWeightMsg] = useState('')

  async function saveWeights() {
    setSavingWeights(true)
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_weight: goalWeight, start_weight: startWeight }),
    })
    if (res.ok) {
      setEditingWeights(false)
      setWeightMsg('Saved')
      setTimeout(() => setWeightMsg(''), 2000)
    }
    setSavingWeights(false)
  }

  const rawGoalProgress = startWeight && goalWeight
    ? Math.max(0, Math.round(
        ((startWeight - (latestCheckin?.weight || startWeight)) /
         (startWeight - goalWeight)) * 100
      ))
    : 0
  const goalProgress = Math.min(100, rawGoalProgress)
  const goalExceeded = rawGoalProgress > 100

  const weightHistory = [...checkins].reverse().map(c => c.weight)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Current Weight', value: latestCheckin ? `${latestCheckin.weight}kg` : '—', sub: `Goal: ${goalWeight}kg` },
          { label: 'Goal Progress', value: goalExceeded ? '100%' : `${goalProgress}%`, sub: goalExceeded ? 'Goal exceeded!' : 'of weight goal' },
          { label: 'Total Weeks', value: weekNumber.toString(), sub: 'weeks coached' },
        ].map(stat => (
          <div key={stat.label} className="bg-navy-card border border-white/8 p-5">
            <Eyebrow className="block mb-2">{stat.label}</Eyebrow>
            <div className="text-3xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              {stat.value}
            </div>
            <div className="text-xs text-grey-muted">{stat.sub}</div>
          </div>
        ))}
      </div>

      {weightHistory.length > 1 && (
        <div className="bg-navy-card border border-white/8 p-6 mb-6">
          <Eyebrow className="block mb-2">Weight History</Eyebrow>
          <div className="flex items-end gap-6">
            <SparkLine data={weightHistory} width={300} height={60} />
            <div className="text-sm text-grey-muted">
              <p>Start: <span className="text-white">{startWeight}kg</span></p>
              <p>Current: <span className="text-white">{latestCheckin?.weight || '—'}kg</span></p>
              <p>Goal: <span className="text-gold">{goalWeight}kg</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Weight Goals */}
      <div className="bg-navy-card border border-white/8 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Weight Goals</Eyebrow>
          {!editingWeights && (
            <button onClick={() => setEditingWeights(true)} className="text-xs text-gold" style={{ fontFamily: 'var(--font-label)' }}>Edit</button>
          )}
        </div>
        <GoldRule />
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <p className="text-grey-muted mb-1">Start Weight</p>
            {editingWeights
              ? <input type="number" value={startWeight} onChange={e => setStartWeight(parseFloat(e.target.value) || 0)} step="0.1" className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
              : <p className="text-white">{startWeight}kg</p>}
          </div>
          <div>
            <p className="text-grey-muted mb-1">Goal Weight</p>
            {editingWeights
              ? <input type="number" value={goalWeight} onChange={e => setGoalWeight(parseFloat(e.target.value) || 0)} step="0.1" className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
              : <p className="text-gold">{goalWeight}kg</p>}
          </div>
          <div>
            <p className="text-grey-muted mb-1">To {goalWeight < startWeight ? 'Lose' : 'Gain'}</p>
            <p className="text-white">{Math.abs(goalWeight - startWeight).toFixed(1)}kg</p>
          </div>
        </div>
        {editingWeights && (
          <div className="flex gap-3 mt-4 items-center">
            <Button size="sm" variant="primary" onClick={saveWeights} disabled={savingWeights}>{savingWeights ? 'Saving...' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingWeights(false); setGoalWeight(client.goal_weight || 0); setStartWeight(client.start_weight || 0) }}>Cancel</Button>
          </div>
        )}
        {weightMsg && <p className="text-xs text-grey-muted mt-2">{weightMsg}</p>}
      </div>

      {latestCheckin && (
        <div className="bg-navy-card border border-white/8 p-6">
          <Eyebrow className="block mb-2">Latest Check-In &mdash; Week {latestCheckin.week_number}</Eyebrow>
          <GoldRule />
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            {[
              { label: 'Weight', value: `${latestCheckin.weight}kg` },
              { label: 'Avg Steps', value: latestCheckin.avg_steps },
              { label: 'Biggest Win', value: latestCheckin.biggest_win },
              { label: 'Diet Summary', value: latestCheckin.diet_summary },
              { label: 'Main Challenge', value: latestCheckin.main_challenge },
              { label: 'Focus Next Week', value: latestCheckin.focus_next_week },
            ].map(item => (
              <div key={item.label}>
                <p className="text-grey-muted mb-0.5">{item.label}</p>
                <p className="text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MidweekChecksTab({ client, midweekChecks }: { client: Client; midweekChecks: MidweekCheck[] }) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState(client.midweek_check_day || 'Wednesday')
  const [savingDay, setSavingDay] = useState(false)
  const [daySaved, setDaySaved] = useState(false)

  async function saveMidweekDay() {
    setSavingDay(true)
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ midweek_check_day: selectedDay }),
    })
    if (res.ok) {
      setDaySaved(true)
      setTimeout(() => setDaySaved(false), 2500)
      router.refresh()
    }
    setSavingDay(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Midweek check day setting */}
      <div className="bg-navy-card border border-white/8 p-5">
        <p className="text-xs text-grey-muted mb-3" style={{ fontFamily: 'var(--font-label)' }}>MIDWEEK CHECK DAY</p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedDay}
            onChange={e => setSelectedDay(e.target.value)}
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={saveMidweekDay}
            disabled={savingDay}
            className="text-xs text-gold disabled:opacity-50"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {savingDay ? 'Saving...' : 'Save'}
          </button>
          {daySaved && <span className="text-xs text-grey-muted">Saved</span>}
        </div>
        <p className="text-xs text-grey-muted mt-2">
          The client will see a midweek check-in prompt on their dashboard on this day.
        </p>
      </div>

      {!midweekChecks.length ? (
        <p className="text-grey-muted text-sm">No midweek checks submitted yet.</p>
      ) : midweekChecks.map(check => (
        <div key={check.id} className="bg-navy-card border border-white/8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Week {check.week_number}
              </h3>
              <p className="text-grey-muted text-sm">
                {new Date(check.submitted_at).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {check.current_weight && (
              <div>
                <p className="text-grey-muted mb-0.5">Weight</p>
                <p className="text-white">{check.current_weight}kg</p>
              </div>
            )}
            <div>
              <p className="text-grey-muted mb-0.5">Training</p>
              <p className={statusColor(check.training_on_track)}>{statusLabel(check.training_on_track)}</p>
            </div>
            <div>
              <p className="text-grey-muted mb-0.5">Food</p>
              <p className={statusColor(check.food_on_track)}>{statusLabel(check.food_on_track)}</p>
            </div>
            <div>
              <p className="text-grey-muted mb-0.5">Energy</p>
              <p className="text-white">{check.energy_level}/5</p>
            </div>
            <div>
              <p className="text-grey-muted mb-0.5">Steps</p>
              <p className={check.steps_on_track ? 'text-green-400' : 'text-red-400'}>
                {check.steps_on_track ? 'On track' : 'Off track'}
              </p>
            </div>
          </div>
          {check.biggest_blocker && (
            <div className="mt-4 pt-4 border-t border-white/8">
              <p className="text-grey-muted text-xs mb-1">Biggest blocker</p>
              <p className="text-white/85 text-sm">{check.biggest_blocker}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function CheckInsTab({ clientId, checkins, checkInDay }: { clientId: string; checkins: WeeklyCheckin[]; checkInDay: string }) {
  const router = useRouter()
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(checkins.map(c => [c.id, c.coach_notes || '']))
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [selectedDay, setSelectedDay] = useState(checkInDay || 'Monday')
  const [savingDay, setSavingDay] = useState(false)
  const [daySaved, setDaySaved] = useState(false)

  async function saveNotes(checkinId: string) {
    const res = await fetch(`/api/checkins/${checkinId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_notes: notes[checkinId] }),
    })
    if (res.ok) {
      setSaved(prev => ({ ...prev, [checkinId]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [checkinId]: false })), 2000)
    }
  }

  async function saveCheckInDay() {
    setSavingDay(true)
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check_in_day: selectedDay }),
    })
    if (res.ok) {
      setDaySaved(true)
      setTimeout(() => setDaySaved(false), 2500)
      router.refresh()
    }
    setSavingDay(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Check-in day setting */}
      <div className="bg-navy-card border border-white/8 p-5">
        <p className="text-xs text-grey-muted mb-3" style={{ fontFamily: 'var(--font-label)' }}>CHECK-IN DAY</p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedDay}
            onChange={e => setSelectedDay(e.target.value)}
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={saveCheckInDay}
            disabled={savingDay}
            className="text-xs text-gold disabled:opacity-50"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {savingDay ? 'Saving...' : 'Save'}
          </button>
          {daySaved && <span className="text-xs text-grey-muted">Saved</span>}
        </div>
        <p className="text-xs text-grey-muted mt-2">
          The client will see a check-in prompt on their dashboard on this day.
        </p>
      </div>

      {checkins.map(checkin => (
        <div key={checkin.id} className="bg-navy-card border border-white/8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Week {checkin.week_number}
              </h3>
              <p className="text-grey-muted text-sm">
                {new Date(checkin.check_in_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            {[
              { label: 'Weight', value: `${checkin.weight}kg` },
              { label: 'Week Summary', value: checkin.week_summary },
              { label: 'Food', value: checkin.diet_summary },
              { label: 'Training Sessions', value: checkin.training_sessions },
              { label: 'Energy', value: checkin.energy_summary },
              { label: 'Sleep', value: checkin.sleep_summary },
              { label: 'Biggest Win', value: checkin.biggest_win },
              { label: 'Biggest Challenge', value: checkin.main_challenge },
              { label: 'Focus Next Week', value: checkin.focus_next_week },
              { label: 'Make Next Week Better', value: checkin.improve_next_week },
              { label: 'Support Needed', value: checkin.coach_support },
              { label: 'Avg Steps', value: checkin.avg_steps },
            ].map(item => item.value ? (
              <div key={item.label}>
                <p className="text-grey-muted mb-0.5">{item.label}</p>
                <p className="text-white/85">{item.value}</p>
              </div>
            ) : null)}
            {checkin.anything_else && (
              <div className="col-span-2">
                <p className="text-grey-muted mb-0.5">Anything Else</p>
                <p className="text-white/85">{checkin.anything_else}</p>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-grey-muted block mb-1">Coach Notes</label>
            <textarea
              value={notes[checkin.id] || ''}
              onChange={e => setNotes(prev => ({ ...prev, [checkin.id]: e.target.value }))}
              className="w-full bg-navy-deep border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
              rows={3}
              placeholder="Add notes for this check-in..."
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => saveNotes(checkin.id)}
                className="text-xs text-gold"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                Save Notes
              </button>
              {saved[checkin.id] && <span className="text-xs text-grey-muted">Saved</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OnboardingTab({ client }: { client: Client }) {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(client.portal_access)

  useEffect(() => {
    fetch(`/api/onboarding/${client.id}`)
      .then(r => r.json())
      .then(data => {
        setResponses(data?.responses ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [client.id])

  async function handleApprove() {
    setApproving(true)
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal_access: true }),
    })
    if (res.ok) {
      setApproved(true)
      router.refresh()
    }
    setApproving(false)
  }

  if (loading) return <p className="text-grey-muted text-sm">Loading...</p>

  if (!client.user_id) {
    return (
      <div className="bg-navy-card border border-white/8 p-6">
        <p className="text-grey-muted text-sm">
          Client has not signed up yet. They can create an account at the login page using the email address on file.
        </p>
      </div>
    )
  }

  if (!responses) {
    return (
      <div className="bg-navy-card border border-white/8 p-6">
        <p className="text-grey-muted text-sm">
          Client has signed up but has not completed onboarding yet.
        </p>
      </div>
    )
  }

  return (
    <div>
      {!approved ? (
        <div className="border border-gold/40 bg-gold/8 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-white text-sm mb-0.5">Onboarding complete</p>
            <p className="text-grey-muted text-xs">Review the responses below, then grant portal access.</p>
          </div>
          <Button size="sm" onClick={handleApprove} disabled={approving}>
            {approving ? 'Approving…' : 'Approve Access'}
          </Button>
        </div>
      ) : (
        <div className="border border-white/8 bg-navy-card p-4 mb-6">
          <p className="text-sm text-green-400">Portal access granted — client can log in to the full portal.</p>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {ONBOARDING_SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-gold text-xs mb-3" style={{ fontFamily: 'var(--font-label)' }}>
              {section.title.toUpperCase()}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.fields.map(field =>
                responses[field.key] ? (
                  <div
                    key={field.key}
                    className={`bg-navy-card border border-white/8 p-4 ${field.wide ? 'sm:col-span-2' : ''}`}
                  >
                    <p className="text-grey-muted text-xs mb-1.5" style={{ fontFamily: 'var(--font-label)' }}>
                      {field.label.toUpperCase()}
                    </p>
                    <p className="text-white/85 text-sm whitespace-pre-wrap">{responses[field.key]}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ClientDetailTabs({
  client,
  checkins,
  midweekChecks,
  programmes,
  targets,
  habits,
  trainingMealPlan,
  restMealPlan,
  supplements,
  weekNumber,
  unreadMessages = 0,
}: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const needsApproval = !!client.user_id && !client.portal_access

  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'midweek', label: 'Midweek' },
    { id: 'checkins', label: 'Check-Ins' },
    { id: 'training', label: 'Training' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'onboarding', label: 'Onboarding', badge: needsApproval },
    { id: 'messages', label: 'Messages', badge: unreadMessages > 0 },
    { id: 'photos', label: 'Photos' },
  ]

  return (
    <div>
      {/* Mobile tab selector */}
      <div className="md:hidden mb-6">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value as Tab)}
          className="w-full bg-navy-mid border border-white/20 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.label}{tab.badge ? ' •' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop tab strip */}
      <div className="hidden md:flex gap-6 border-b border-white/8 mb-8 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm transition-colors relative whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'text-gold border-b-2 border-gold'
                : 'text-grey-muted hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-gold rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab client={client} checkins={checkins} weekNumber={weekNumber} />
      )}
      {activeTab === 'midweek' && <MidweekChecksTab client={client} midweekChecks={midweekChecks} />}
      {activeTab === 'checkins' && <CheckInsTab clientId={client.id} checkins={checkins} checkInDay={client.check_in_day} />}
      {activeTab === 'training' && (
        <div className="bg-navy-card border border-white/8 p-6">
          <ProgrammeEditor clientId={client.id} initialProgrammes={programmes} />
        </div>
      )}
      {activeTab === 'nutrition' && (
        <div className="flex flex-col gap-6">
          <div className="bg-navy-card border border-white/8 p-6">
            <NutritionTargetsForm clientId={client.id} initialTargets={targets} />
          </div>
          <div className="bg-navy-card border border-white/8 p-6">
            <MealPlanBuilder
              clientId={client.id}
              initialTrainingPlan={trainingMealPlan}
              initialRestPlan={restMealPlan}
            />
          </div>
          <div className="bg-navy-card border border-white/8 p-6">
            <SupplementsEditor clientId={client.id} initialSupplements={supplements} />
          </div>
          <div className="bg-navy-card border border-white/8 p-6">
            <HabitManager clientId={client.id} initialHabits={habits} />
          </div>
        </div>
      )}
      {activeTab === 'onboarding' && <OnboardingTab client={client} />}
      {activeTab === 'messages' && (
        <MessagingTab clientId={client.id} clientName={client.full_name} clientUserId={client.user_id} />
      )}
      {activeTab === 'photos' && (
        <PhotosTab clientId={client.id} weekNumber={weekNumber} checkins={checkins} />
      )}
    </div>
  )
}
