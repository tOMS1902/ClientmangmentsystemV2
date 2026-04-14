'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { AITab } from '@/components/coach/AITab'
import { ClientPortalManager } from '@/components/coach/ClientPortalManager'
import { VoicePlayer } from '@/components/VoicePlayer'
import { ShoppingListAI } from '@/components/coach/ShoppingListAI'
import type { Client, WeeklyCheckin, MidweekCheck, Programme, NutritionTargets, Habit, MealPlan, Supplement, TrackingStatus } from '@/lib/types'
import { displayWeight, toKg, unitLabel, kgToLbs, type WeightUnit } from '@/lib/units'

interface ClientDetailTabsProps {
  client: Client
  checkins: WeeklyCheckin[]
  midweekChecks: MidweekCheck[]
  programmes: Programme[]
  targets: NutritionTargets | null
  habits: Habit[]
  mealPlans: MealPlan[]
  supplements: Supplement[]
  weekNumber: number
  unreadMessages?: number
  lastWeights: Record<string, number | null>
  badges: string[]
}

type Tab = 'overview' | 'midweek' | 'checkins' | 'training' | 'nutrition' | 'onboarding' | 'legal' | 'messages' | 'photos' | 'portal' | 'ai' | 'diagnostics'

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

function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/clients')
    } else {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-xs text-red-400">Delete {clientName}? This cannot be undone.</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 border border-red-400/40 px-3 py-1.5 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {deleting ? 'Deleting...' : 'Confirm Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-grey-muted hover:text-white transition-colors"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-400/60 hover:text-red-400 transition-colors border border-red-400/20 px-3 py-1.5"
      style={{ fontFamily: 'var(--font-label)' }}
    >
      Delete Client
    </button>
  )
}

function OverviewTab({ client, checkins, weekNumber }: Pick<ClientDetailTabsProps, 'client' | 'checkins' | 'weekNumber'>) {
  const router = useRouter()
  const unit: WeightUnit = client.weight_unit ?? 'kg'
  const latestCheckin = checkins[0] || null

  // Weight goals edit state
  const [goalWeight, setGoalWeight] = useState(unit === 'lbs' ? kgToLbs(client.goal_weight || 0) : (client.goal_weight || 0))
  const [startWeight, setStartWeight] = useState(unit === 'lbs' ? kgToLbs(client.start_weight || 0) : (client.start_weight || 0))
  const [editingWeights, setEditingWeights] = useState(false)
  const [savingWeights, setSavingWeights] = useState(false)
  const [weightMsg, setWeightMsg] = useState('')

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [fullName, setFullName] = useState(client.full_name)
  const [phone, setPhone] = useState(client.phone || '')
  const [startDate, setStartDate] = useState(client.start_date || '')
  const [goalText, setGoalText] = useState(client.goal_text || '')
  const [profileWeightUnit, setProfileWeightUnit] = useState<'kg' | 'lbs'>(client.weight_unit ?? 'kg')
  const [trackWeight, setTrackWeight] = useState(client.track_weight ?? true)
  const [isActive, setIsActive] = useState(client.is_active ?? true)
  const [loomSent, setLoomSent] = useState(client.loom_sent ?? false)
  const [weeklyCheckinEnabled, setWeeklyCheckinEnabled] = useState(client.weekly_checkin_enabled ?? true)

  async function saveProfile() {
    setSavingProfile(true)
    setProfileMsg('')
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        phone: phone || undefined,
        start_date: startDate || undefined,
        goal_text: goalText || undefined,
        weight_unit: profileWeightUnit,
        track_weight: trackWeight,
        is_active: isActive,
        weekly_checkin_enabled: weeklyCheckinEnabled,
      }),
    })
    if (res.ok) {
      setEditingProfile(false)
      setProfileMsg('Saved')
      router.refresh()
      setTimeout(() => setProfileMsg(''), 2000)
    } else {
      const err = await res.json().catch(() => ({}))
      setProfileMsg(err.error || 'Failed to save')
    }
    setSavingProfile(false)
  }

  async function saveWeights() {
    setSavingWeights(true)
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // Always save kg to DB regardless of display unit
      body: JSON.stringify({ goal_weight: toKg(goalWeight, unit), start_weight: toKg(startWeight, unit) }),
    })
    if (res.ok) {
      setEditingWeights(false)
      setWeightMsg('Saved')
      setTimeout(() => setWeightMsg(''), 2000)
    }
    setSavingWeights(false)
  }

  // Progress uses raw kg from DB for consistency
  const startKg = client.start_weight || 0
  const goalKg = client.goal_weight || 0
  const currentKg = latestCheckin?.weight ?? null
  const rawGoalProgress = startKg && goalKg && currentKg != null
    ? Math.max(0, Math.round(
        ((startKg - currentKg) / (startKg - goalKg)) * 100
      ))
    : 0
  const goalProgress = Math.min(100, rawGoalProgress)
  const goalExceeded = rawGoalProgress > 100

  const weightHistory = [...checkins].reverse().map(c => c.weight != null ? displayWeight(c.weight, unit) : null).filter((w): w is number => w != null)

  const currentWeightDisplay = currentKg != null ? `${displayWeight(currentKg, unit)}${unitLabel(unit)}` : '—'
  const goalWeightDisplay = `${goalWeight.toFixed(1)}${unitLabel(unit)}`

  return (
    <div>
      {/* Loom Sent toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-grey-muted" style={{ fontFamily: 'var(--font-label)' }}>LOOM</span>
        <button
          type="button"
          onClick={async () => {
            const newVal = !loomSent
            setLoomSent(newVal)
            await fetch(`/api/clients/${client.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loom_sent: newVal }),
            })
          }}
          className={`text-xs px-3 py-1.5 border transition-colors ${loomSent ? 'border-blue-400 text-blue-400 bg-blue-400/10' : 'border-white/20 text-white/50 hover:border-white/50'}`}
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {loomSent ? '✓ Loom sent' : 'Mark Loom sent'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Current Weight', value: currentWeightDisplay, sub: `Goal: ${goalWeightDisplay}` },
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

      {weightHistory.filter(Boolean).length > 1 && (
        <div className="bg-navy-card border border-white/8 p-6 mb-6">
          <Eyebrow className="block mb-2">Weight History</Eyebrow>
          <div className="flex items-end gap-6">
            <SparkLine data={weightHistory} width={300} height={60} />
            <div className="text-sm text-grey-muted">
              <p>Start: <span className="text-white">{startWeight.toFixed(1)}{unitLabel(unit)}</span></p>
              <p>Current: <span className="text-white">{currentWeightDisplay}</span></p>
              <p>Goal: <span className="text-gold">{goalWeightDisplay}</span></p>
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
            <p className="text-grey-muted mb-1">Start Weight ({unitLabel(unit)})</p>
            {editingWeights
              ? <input type="number" value={startWeight} onChange={e => setStartWeight(parseFloat(e.target.value) || 0)} step="0.1" className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
              : <p className="text-white">{startWeight.toFixed(1)}{unitLabel(unit)}</p>}
          </div>
          <div>
            <p className="text-grey-muted mb-1">Goal Weight ({unitLabel(unit)})</p>
            {editingWeights
              ? <input type="number" value={goalWeight} onChange={e => setGoalWeight(parseFloat(e.target.value) || 0)} step="0.1" className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
              : <p className="text-gold">{goalWeight.toFixed(1)}{unitLabel(unit)}</p>}
          </div>
          <div>
            <p className="text-grey-muted mb-1">To {goalWeight < startWeight ? 'Lose' : 'Gain'}</p>
            <p className="text-white">{Math.abs(goalWeight - startWeight).toFixed(1)}{unitLabel(unit)}</p>
          </div>
        </div>
        {editingWeights && (
          <div className="flex gap-3 mt-4 items-center">
            <Button size="sm" variant="primary" onClick={saveWeights} disabled={savingWeights}>{savingWeights ? 'Saving...' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              setEditingWeights(false)
              setGoalWeight(unit === 'lbs' ? kgToLbs(client.goal_weight || 0) : (client.goal_weight || 0))
              setStartWeight(unit === 'lbs' ? kgToLbs(client.start_weight || 0) : (client.start_weight || 0))
            }}>Cancel</Button>
          </div>
        )}
        {weightMsg && <p className="text-xs text-grey-muted mt-2">{weightMsg}</p>}
      </div>

      {/* Client Profile */}
      <div className="bg-navy-card border border-white/8 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Client Profile</Eyebrow>
          {!editingProfile && (
            <button onClick={() => setEditingProfile(true)} className="text-xs text-gold" style={{ fontFamily: 'var(--font-label)' }}>Edit</button>
          )}
        </div>
        <GoldRule />
        {editingProfile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-grey-muted mb-1">Full Name</p>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
            </div>
            <div>
              <p className="text-grey-muted mb-1">Phone</p>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
            </div>
            <div>
              <p className="text-grey-muted mb-1">Start Date</p>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold" />
            </div>
            <div>
              <p className="text-grey-muted mb-1">Weight Unit</p>
              <div className="flex gap-2 mt-1">
                {(['kg', 'lbs'] as const).map(u => (
                  <button key={u} type="button" onClick={() => setProfileWeightUnit(u)}
                    className={`px-4 py-1.5 text-xs border transition-colors ${profileWeightUnit === u ? 'border-gold bg-gold/10 text-gold' : 'border-white/20 text-white/60 hover:border-white/50'}`}
                    style={{ fontFamily: 'var(--font-label)' }}>{u}</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-grey-muted mb-1">Goal</p>
              <textarea value={goalText} onChange={e => setGoalText(e.target.value)} rows={2} className="w-full bg-navy-deep border border-white/20 text-white p-2 text-sm focus:outline-none focus:border-gold resize-none" />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-white/85 text-sm">
                <input type="checkbox" checked={trackWeight} onChange={e => setTrackWeight(e.target.checked)} className="accent-gold" />
                Track weight
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-white/85 text-sm">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-gold" />
                Active client
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-white/85 text-sm">
                <input type="checkbox" checked={weeklyCheckinEnabled} onChange={e => setWeeklyCheckinEnabled(e.target.checked)} className="accent-gold" />
                Weekly check-in
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-3 items-center">
              <Button size="sm" variant="primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save'}</Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setEditingProfile(false)
                setFullName(client.full_name)
                setPhone(client.phone || '')
                setStartDate(client.start_date || '')
                setGoalText(client.goal_text || '')
                setProfileWeightUnit(client.weight_unit ?? 'kg')
                setTrackWeight(client.track_weight ?? true)
                setIsActive(client.is_active ?? true)
                setWeeklyCheckinEnabled(client.weekly_checkin_enabled ?? true)
              }}>Cancel</Button>
              {profileMsg && <span className={`text-xs ${profileMsg === 'Saved' ? 'text-grey-muted' : 'text-red-400'}`}>{profileMsg}</span>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
            <div><p className="text-grey-muted mb-0.5">Name</p><p className="text-white">{client.full_name}</p></div>
            <div><p className="text-grey-muted mb-0.5">Phone</p><p className="text-white">{client.phone || '—'}</p></div>
            <div><p className="text-grey-muted mb-0.5">Start Date</p><p className="text-white">{client.start_date || '—'}</p></div>
            <div><p className="text-grey-muted mb-0.5">Weight Unit</p><p className="text-white">{client.weight_unit ?? 'kg'}</p></div>
            <div><p className="text-grey-muted mb-0.5">Track Weight</p><p className="text-white">{client.track_weight ? 'Yes' : 'No'}</p></div>
            <div><p className="text-grey-muted mb-0.5">Status</p><p className={client.is_active ? 'text-green-400' : 'text-grey-muted'}>{client.is_active ? 'Active' : 'Inactive'}</p></div>
            <div><p className="text-grey-muted mb-0.5">Weekly Check-In</p><p className={(client.weekly_checkin_enabled ?? true) ? 'text-green-400' : 'text-grey-muted'}>{(client.weekly_checkin_enabled ?? true) ? 'Enabled' : 'Disabled'}</p></div>
            {client.goal_text && <div className="col-span-2 sm:col-span-3"><p className="text-grey-muted mb-0.5">Goal</p><p className="text-white/85">{client.goal_text}</p></div>}
            {profileMsg && <p className="text-xs text-grey-muted">{profileMsg}</p>}
          </div>
        )}
      </div>

      {latestCheckin && (
        <div className="bg-navy-card border border-white/8 p-6">
          <Eyebrow className="block mb-2">Latest Check-In &mdash; Week {latestCheckin.week_number}</Eyebrow>
          <GoldRule />
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            {[
              { label: 'Weight', value: latestCheckin.weight != null ? `${displayWeight(latestCheckin.weight, unit)}${unitLabel(unit)}` : '—' },
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

      {/* Danger Zone */}
      <div className="bg-navy-card border border-red-900/30 p-6 mt-2">
        <p className="text-xs text-red-400/70 mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>DANGER ZONE</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/85 text-sm">Delete Client</p>
            <p className="text-grey-muted text-xs">Permanently removes all client data. This cannot be undone.</p>
          </div>
          <DeleteClientButton clientId={client.id} clientName={client.full_name} />
        </div>
      </div>
    </div>
  )
}

function MidweekChecksTab({ client, midweekChecks }: { client: Client; midweekChecks: MidweekCheck[] }) {
  const router = useRouter()
  const unit: WeightUnit = client.weight_unit ?? 'kg'
  const [selectedDay, setSelectedDay] = useState(client.midweek_check_day || 'Wednesday')
  const [savingDay, setSavingDay] = useState(false)
  const [daySaved, setDaySaved] = useState(false)
  const [midweekEnabled, setMidweekEnabled] = useState(client.midweek_check_enabled ?? true)
  const [savingEnabled, setSavingEnabled] = useState(false)

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

  async function toggleMidweekEnabled() {
    setSavingEnabled(true)
    const newVal = !midweekEnabled
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ midweek_check_enabled: newVal }),
    })
    if (res.ok) setMidweekEnabled(newVal)
    setSavingEnabled(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Midweek check settings */}
      <div className="bg-navy-card border border-white/8 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-grey-muted" style={{ fontFamily: 'var(--font-label)' }}>MIDWEEK CHECK-IN</p>
          <button
            onClick={toggleMidweekEnabled}
            disabled={savingEnabled}
            className={`text-xs px-3 py-1.5 border transition-colors disabled:opacity-50 ${midweekEnabled ? 'border-green-500/60 text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'border-white/20 text-white/50 hover:border-white/50'}`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {savingEnabled ? '...' : midweekEnabled ? '✓ Enabled' : 'Disabled'}
          </button>
        </div>
        {midweekEnabled && (
          <>
            <p className="text-xs text-grey-muted mb-3" style={{ fontFamily: 'var(--font-label)' }}>CHECK DAY</p>
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
          </>
        )}
        {!midweekEnabled && (
          <p className="text-xs text-grey-muted mt-1">Midweek check-in is off — no prompt will appear on the client&apos;s dashboard.</p>
        )}
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
            {check.current_weight != null && (
              <div>
                <p className="text-grey-muted mb-0.5">Weight</p>
                <p className="text-white">{displayWeight(check.current_weight, unit)}{unitLabel(unit)}</p>
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
          {check.voice_note_url && (
            <div className="mt-4 pt-4 border-t border-white/8">
              <p className="text-grey-muted text-xs mb-2">Voice Note</p>
              <VoicePlayer url={check.voice_note_url} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DIET_LABELS: Record<string, string> = {
  on_track: 'On track',
  mostly_on_track: 'Mostly on track',
  mixed: 'Mixed',
  off_track: 'Off track',
}

const TRAINING_LABELS: Record<string, string> = {
  all: 'All sessions done',
  missed_1: 'Missed 1',
  missed_2plus: 'Missed 2+',
  none: 'None',
}

function ScorePill({ value, max = 10 }: { value: number | null; max?: number }) {
  if (value == null) return null
  const pct = value / max
  const color = pct >= 0.7 ? 'text-green-400' : pct >= 0.4 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-semibold ${color}`}>{value}<span className="text-grey-muted text-xs">/{max}</span></span>
}

function CheckinEditRow({ checkin, unit, onSave }: { checkin: WeeklyCheckin; unit: WeightUnit; onSave: (updated: WeeklyCheckin) => void }) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(checkin.weight != null ? String(displayWeight(checkin.weight, unit)) : '')
  const [weekScore, setWeekScore] = useState(String(checkin.week_score ?? ''))
  const [coachNotes, setCoachNotes] = useState(checkin.coach_notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/checkins/${checkin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: weight ? toKg(parseFloat(weight), unit) : null,
        week_score: weekScore ? parseInt(weekScore) : null,
        coach_notes: coachNotes || null,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      onSave(updated)
      setEditing(false)
    }
    setSaving(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-white/40 hover:text-gold transition-colors"
        style={{ fontFamily: 'var(--font-label)' }}
      >
        Edit
      </button>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/8 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-grey-muted block mb-1">Weight ({unitLabel(unit)})</label>
          <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
            className="w-full bg-navy-mid border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="text-xs text-grey-muted block mb-1">Week Score</label>
          <input type="number" min={1} max={10} value={weekScore} onChange={e => setWeekScore(e.target.value)}
            className="w-full bg-navy-mid border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold" />
        </div>
      </div>
      <div>
        <label className="text-xs text-grey-muted block mb-1">Coach Notes</label>
        <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)} rows={2}
          className="w-full bg-navy-mid border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold resize-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="text-xs px-3 py-1.5 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50"
          style={{ fontFamily: 'var(--font-label)' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)}
          className="text-xs px-3 py-1.5 border border-white/20 text-white/50 hover:text-white/85 transition-colors"
          style={{ fontFamily: 'var(--font-label)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function CheckInsTab({ clientId, checkins: initialCheckins, checkInDay, weightUnit }: { clientId: string; checkins: WeeklyCheckin[]; checkInDay: string; weightUnit: WeightUnit }) {
  const unit = weightUnit
  const router = useRouter()
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>(initialCheckins)
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialCheckins.map(c => [c.id, c.coach_notes || '']))
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [selectedDay, setSelectedDay] = useState(checkInDay || 'Monday')
  const [savingDay, setSavingDay] = useState(false)
  const [daySaved, setDaySaved] = useState(false)

  function handleCheckinSave(updated: WeeklyCheckin) {
    setCheckins(prev => prev.map(c => c.id === updated.id ? updated : c))
    setNotes(prev => ({ ...prev, [updated.id]: updated.coach_notes || '' }))
  }

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

  // Build chart data (oldest → newest)
  const sorted = [...checkins].reverse()
  const weightData = sorted.map(c => c.weight).filter(Boolean) as number[]
  const weekScoreData = sorted.map(c => c.week_score).filter((v): v is number => v != null)
  const hungerData = sorted.map(c => c.hunger_score).filter((v): v is number => v != null)
  const cravingsData = sorted.map(c => c.cravings_score).filter((v): v is number => v != null)
  const hasCharts = weightData.length >= 2 || weekScoreData.length >= 2

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

      {/* Progress charts */}
      {hasCharts && (
        <div className="bg-navy-card border border-white/8 p-5">
          <p className="text-xs text-grey-muted mb-4" style={{ fontFamily: 'var(--font-label)' }}>TRENDS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {weightData.length >= 2 && (
              <div>
                <p className="text-xs text-grey-muted mb-1">Weight</p>
                <p className="text-white text-sm mb-2">{displayWeight(weightData[weightData.length - 1], unit)}{unitLabel(unit)}</p>
                <SparkLine data={weightData.map(w => displayWeight(w, unit))} width={120} height={36} />
              </div>
            )}
            {weekScoreData.length >= 2 && (
              <div>
                <p className="text-xs text-grey-muted mb-1">Weekly Score</p>
                <p className="text-white text-sm mb-2">{weekScoreData[weekScoreData.length - 1]}/10</p>
                <SparkLine data={weekScoreData} width={120} height={36} />
              </div>
            )}
            {hungerData.length >= 2 && (
              <div>
                <p className="text-xs text-grey-muted mb-1">Hunger</p>
                <p className="text-white text-sm mb-2">{hungerData[hungerData.length - 1]}/10</p>
                <SparkLine data={hungerData} width={120} height={36} color="#6b7280" />
              </div>
            )}
            {cravingsData.length >= 2 && (
              <div>
                <p className="text-xs text-grey-muted mb-1">Cravings</p>
                <p className="text-white text-sm mb-2">{cravingsData[cravingsData.length - 1]}/10</p>
                <SparkLine data={cravingsData} width={120} height={36} color="#6b7280" />
              </div>
            )}
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3">
              {checkin.week_score != null && (
                <div className="text-right">
                  <p className="text-xs text-grey-muted mb-0.5">Week Score</p>
                  <ScorePill value={checkin.week_score} />
                </div>
              )}
              <CheckinEditRow checkin={checkin} unit={unit} onSave={handleCheckinSave} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><p className="text-grey-muted mb-0.5">Weight</p><p className="text-white/85">{checkin.weight != null ? `${displayWeight(checkin.weight, unit)}${unitLabel(unit)}` : '—'}</p></div>

            {/* New structured fields */}
            {checkin.diet_rating && (
              <div><p className="text-grey-muted mb-0.5">Food</p><p className="text-white/85">{DIET_LABELS[checkin.diet_rating] ?? checkin.diet_rating}</p></div>
            )}
            {checkin.training_completed && (
              <div><p className="text-grey-muted mb-0.5">Training</p><p className="text-white/85">{TRAINING_LABELS[checkin.training_completed] ?? checkin.training_completed}</p></div>
            )}
            {checkin.energy_score != null && (
              <div><p className="text-grey-muted mb-0.5">Energy</p><ScorePill value={checkin.energy_score} /></div>
            )}
            {checkin.sleep_score != null && (
              <div><p className="text-grey-muted mb-0.5">Sleep</p><ScorePill value={checkin.sleep_score} /></div>
            )}
            {checkin.hunger_score != null && (
              <div><p className="text-grey-muted mb-0.5">Hunger</p><ScorePill value={checkin.hunger_score} /></div>
            )}
            {checkin.cravings_score != null && (
              <div><p className="text-grey-muted mb-0.5">Cravings</p><ScorePill value={checkin.cravings_score} /></div>
            )}
            {checkin.avg_steps && (
              <div><p className="text-grey-muted mb-0.5">Avg Steps</p><p className="text-white/85">{checkin.avg_steps}</p></div>
            )}
            {checkin.focus_areas && (
              <div><p className="text-grey-muted mb-0.5">Focus Next Week</p><p className="text-white/85">{checkin.focus_areas}</p></div>
            )}
            {checkin.biggest_win && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Biggest Win</p><p className="text-white/85">{checkin.biggest_win}</p></div>
            )}
            {checkin.main_challenge && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Biggest Challenge</p><p className="text-white/85">{checkin.main_challenge}</p></div>
            )}
            {checkin.improve_next_week && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Make Next Week Better</p><p className="text-white/85">{checkin.improve_next_week}</p></div>
            )}
            {checkin.coach_support && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Support Needed</p><p className="text-white/85">{checkin.coach_support}</p></div>
            )}
            {checkin.anything_else && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Anything Else</p><p className="text-white/85">{checkin.anything_else}</p></div>
            )}
            {/* Legacy text fields fallback */}
            {checkin.week_summary && !checkin.week_score && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Week Summary</p><p className="text-white/85">{checkin.week_summary}</p></div>
            )}
            {checkin.diet_summary && !checkin.diet_rating && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Food</p><p className="text-white/85">{checkin.diet_summary}</p></div>
            )}
            {checkin.energy_summary && !checkin.energy_score && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Energy</p><p className="text-white/85">{checkin.energy_summary}</p></div>
            )}
            {checkin.sleep_summary && !checkin.sleep_score && (
              <div className="col-span-2"><p className="text-grey-muted mb-0.5">Sleep</p><p className="text-white/85">{checkin.sleep_summary}</p></div>
            )}
            {checkin.training_sessions && !checkin.training_completed && (
              <div><p className="text-grey-muted mb-0.5">Training Sessions</p><p className="text-white/85">{checkin.training_sessions}</p></div>
            )}
          </div>

          {checkin.voice_note_url && (
            <div className="mb-4 pt-3 border-t border-white/8">
              <p className="text-xs text-grey-muted mb-2">Voice Note</p>
              <VoicePlayer url={checkin.voice_note_url} />
            </div>
          )}

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

interface LegalSubmission {
  submitted_at: string; first_name: string; last_name: string; email: string; dob: string
  country: string; role: string | null; firm: string | null; ip_address: string | null
  parq_q1: boolean; parq_q2: boolean; parq_q3: boolean; parq_q4: boolean
  parq_q5: boolean; parq_q6: boolean; parq_q7: boolean; parq_q8: boolean
  parq_health_details: string; parq_medications: string
  bloodwork_consent: string; genetics_consent: string
  photo_storage_consent: string; photo_marketing_consent: string
  digital_signature: string; signature_date: string
}

const PARQ_LABELS = [
  'Heart condition / exercise only under medical supervision',
  'Chest pain or discomfort during physical activity',
  'Chest pain when not exercising (past month)',
  'Faint, dizzy, or loss of balance/consciousness',
  'Bone, joint, or muscular problem that could worsen with exercise',
  'On blood pressure or heart medication',
  'Pregnant or given birth in last 6 months',
  'Other reason not to exercise at this time',
]

function LegalOnboardingTab({ client }: { client: Client }) {
  const [sub, setSub] = useState<LegalSubmission | null | undefined>(undefined)

  useEffect(() => {
    if (!client.user_id) { setSub(null); return }
    fetch(`/api/onboarding/legal/${client.id}`)
      .then(r => r.json())
      .then(d => setSub(d ?? null))
      .catch(() => setSub(null))
  }, [client.id, client.user_id])

  if (sub === undefined) return <p className="text-grey-muted text-sm">Loading...</p>

  if (!client.user_id) {
    return (
      <div className="bg-navy-card border border-white/8 p-6">
        <p className="text-grey-muted text-sm">Client has not created a portal account yet. Legal onboarding cannot be completed until they sign up.</p>
      </div>
    )
  }

  if (!sub) {
    return (
      <div className="bg-navy-card border border-white/8 p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-red-400 text-lg">✗</span>
          <p className="text-white text-sm font-medium">Legal onboarding not yet completed</p>
        </div>
        <p className="text-grey-muted text-xs">The client must complete the legal onboarding form before accessing the portal. They will be redirected automatically on next login.</p>
      </div>
    )
  }

  const parqYesIndexes = [sub.parq_q1,sub.parq_q2,sub.parq_q3,sub.parq_q4,sub.parq_q5,sub.parq_q6,sub.parq_q7,sub.parq_q8]
    .map((v, i) => v ? i : -1).filter(i => i >= 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Status banner */}
      <div className="border border-green-400/30 bg-green-400/5 p-4 flex items-center gap-3">
        <span className="text-green-400 text-lg">✓</span>
        <div>
          <p className="text-white text-sm font-medium">Legal onboarding complete</p>
          <p className="text-grey-muted text-xs">Signed {new Date(sub.submitted_at).toLocaleString('en-IE', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
        </div>
      </div>

      {/* PAR-Q flags */}
      {parqYesIndexes.length > 0 && (
        <div className="border border-amber-400/40 bg-amber-400/5 p-4">
          <p className="text-amber-400 text-xs mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            ⚠ PAR-Q — {parqYesIndexes.length} YES Answer{parqYesIndexes.length > 1 ? 's' : ''}
          </p>
          {parqYesIndexes.map(i => (
            <p key={i} className="text-sm text-amber-200 mb-1">• {PARQ_LABELS[i]}</p>
          ))}
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Full Name', value: `${sub.first_name} ${sub.last_name}` },
          { label: 'Email', value: sub.email },
          { label: 'Date of Birth', value: sub.dob },
          { label: 'Country', value: sub.country },
          { label: 'Role', value: sub.role || '—' },
          { label: 'Firm', value: sub.firm || '—' },
          { label: 'Digital Signature', value: sub.digital_signature },
          { label: 'Signature Date', value: sub.signature_date },
          { label: 'IP Address', value: sub.ip_address || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-navy-card border border-white/8 p-4">
            <p className="text-grey-muted text-xs mb-1.5" style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
            <p className="text-white/85 text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Consents */}
      <div>
        <p className="text-gold text-xs mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px', textTransform: 'uppercase' }}>Consent Choices</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Bloodwork Review', value: sub.bloodwork_consent },
            { label: 'Genetic Testing', value: sub.genetics_consent },
            { label: 'Progress Photos (Storage)', value: sub.photo_storage_consent },
            { label: 'Progress Photos (Marketing)', value: sub.photo_marketing_consent },
          ].map(({ label, value }) => (
            <div key={label} className="bg-navy-card border border-white/8 p-4">
              <p className="text-grey-muted text-xs mb-1.5" style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
              <p className={`text-sm font-medium ${value === 'consented' ? 'text-green-400' : value === 'declined' ? 'text-grey-muted' : 'text-grey-muted'}`}>
                {value === 'consented' ? '✓ Consented' : value === 'not_applicable' ? '— Not applicable' : '✗ Declined'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Health details */}
      <div className="bg-navy-card border border-white/8 p-4">
        <p className="text-grey-muted text-xs mb-1.5" style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '1px' }}>Health Details (PAR-Q)</p>
        <p className="text-white/85 text-sm whitespace-pre-wrap">{sub.parq_health_details}</p>
      </div>
      <div className="bg-navy-card border border-white/8 p-4">
        <p className="text-grey-muted text-xs mb-1.5" style={{ fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '1px' }}>Medications</p>
        <p className="text-white/85 text-sm whitespace-pre-wrap">{sub.parq_medications}</p>
      </div>

      <p className="text-grey-muted text-xs">
        This is a legal record. It must not be deleted without a formal GDPR erasure request from the client. Contact calumfraserfitness@gmail.com to process an erasure request.
      </p>
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

  return (
    <div>
      {!approved ? (
        <div className="border border-gold/40 bg-gold/8 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-white text-sm mb-0.5">{responses ? 'Onboarding complete' : 'Account created — no onboarding submitted'}</p>
            <p className="text-grey-muted text-xs">{responses ? 'Review the responses below, then grant portal access.' : 'Grant portal access to let this client log in.'}</p>
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

      {!responses && (
        <div className="bg-navy-card border border-white/8 p-6">
          <p className="text-grey-muted text-sm">No onboarding responses submitted yet.</p>
        </div>
      )}

      {responses && (
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
      )}
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
  mealPlans,
  supplements,
  weekNumber,
  unreadMessages = 0,
  lastWeights,
  badges,
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
    { id: 'legal', label: 'Legal' },
    { id: 'messages', label: 'Messages', badge: unreadMessages > 0 },
    { id: 'photos', label: 'Photos' },
    { id: 'portal', label: 'Portal' },
    { id: 'ai', label: 'AI' },
    { id: 'diagnostics', label: 'Diagnostics' },
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
      {activeTab === 'checkins' && <CheckInsTab clientId={client.id} checkins={checkins} checkInDay={client.check_in_day} weightUnit={client.weight_unit ?? 'kg'} />}
      {activeTab === 'training' && (
        <div className="bg-navy-card border border-white/8 p-6">
          <ProgrammeEditor clientId={client.id} initialProgrammes={programmes} initialLastWeights={lastWeights} />
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
              initialPlans={mealPlans}
            />
          </div>
          <div className="bg-navy-card border border-white/8 p-6">
            <SupplementsEditor clientId={client.id} initialSupplements={supplements} />
          </div>
          <div className="bg-navy-card border border-white/8 p-6">
            <HabitManager clientId={client.id} initialHabits={habits} />
          </div>
          <div className="bg-navy-card border border-white/8 p-6">
            <ShoppingListAI
              clientId={client.id}
              mealPlans={mealPlans}
            />
          </div>
        </div>
      )}
      {activeTab === 'onboarding' && <OnboardingTab client={client} />}
      {activeTab === 'legal' && <LegalOnboardingTab client={client} />}
      {activeTab === 'messages' && (
        <MessagingTab clientId={client.id} clientName={client.full_name} clientUserId={client.user_id} />
      )}
      {activeTab === 'photos' && (
        <PhotosTab clientId={client.id} weekNumber={weekNumber} checkins={checkins} />
      )}
      {activeTab === 'portal' && (
        <div className="bg-navy-card border border-white/8 p-6">
          <ClientPortalManager
            clientId={client.id}
            weekNumber={weekNumber}
            initialWelcomeVideoUrl={client.welcome_video_url}
            initialBadges={badges}
          />
        </div>
      )}
      {activeTab === 'ai' && (
        <AITab clientId={client.id} clientName={client.full_name} />
      )}
      {activeTab === 'diagnostics' && (
        <div className="bg-navy-card border border-white/8 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg text-white" style={{ fontFamily: 'var(--font-display)' }}>Diagnostic Reports</h2>
              <p className="text-sm text-grey-muted mt-1">Blood work and genetics reports for this client</p>
            </div>
            <Link
              href={`/clients/${client.id}/reports/new`}
              className="px-4 py-2 text-sm bg-gold text-navy-dark font-medium hover:bg-gold/90 transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              + New Report
            </Link>
          </div>
          <Link
            href={`/clients/${client.id}/reports`}
            className="flex items-center justify-between p-4 border border-white/8 hover:border-gold/30 hover:bg-white/4 transition-colors group"
          >
            <span className="text-sm text-grey-muted group-hover:text-white transition-colors">View all reports →</span>
          </Link>
        </div>
      )}
    </div>
  )
}
