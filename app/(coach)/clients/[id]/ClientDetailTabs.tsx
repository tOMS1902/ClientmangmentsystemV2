'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { MetricBar } from '@/components/ui/MetricBar'
import { SparkLine } from '@/components/ui/SparkLine'
import { ProgrammeEditor } from '@/components/coach/ProgrammeEditor'
import { NutritionTargetsForm } from '@/components/coach/NutritionTargetsForm'
import { MealPlanBuilder } from '@/components/coach/MealPlanBuilder'
import { HabitManager } from '@/components/coach/HabitManager'
import type { Client, WeeklyCheckin, DailyLog, Programme, NutritionTargets, Habit, MealPlan } from '@/lib/types'

interface ClientDetailTabsProps {
  client: Client
  checkins: WeeklyCheckin[]
  logs: DailyLog[]
  programme: Programme | null
  targets: NutritionTargets | null
  habits: Habit[]
  trainingMealPlan: MealPlan | null
  restMealPlan: MealPlan | null
  weekNumber: number
}

type Tab = 'overview' | 'logs' | 'checkins' | 'training' | 'nutrition' | 'onboarding'

const QUESTION_LABELS: Record<string, string> = {
  goal: 'Main Goal',
  current_weight: 'Current Weight (kg)',
  goal_weight: 'Goal Weight (kg)',
  height: 'Height (cm)',
  age: 'Age',
  activity_level: 'Activity Level',
  training_experience: 'Training Experience',
  training_days: 'Training Days / Week',
  equipment: 'Equipment',
  injuries: 'Injuries / Limitations',
  daily_schedule: 'Daily Schedule',
  dietary_preferences: 'Dietary Preferences',
  what_worked: "What Has / Hasn't Worked",
}

function OverviewTab({ client, checkins, logs, targets, weekNumber }: Pick<ClientDetailTabsProps, 'client' | 'checkins' | 'logs' | 'targets' | 'weekNumber'>) {
  const latestCheckin = checkins[0] || null
  const goalProgress = client.start_weight && client.goal_weight
    ? Math.min(100, Math.max(0, Math.round(
        ((client.start_weight - (latestCheckin?.weight || client.start_weight)) /
         (client.start_weight - client.goal_weight)) * 100
      )))
    : 0

  const today = new Date().toISOString().split('T')[0]
  const todayLog = logs.find(l => l.log_date === today) || null

  const last7 = logs.filter(l => {
    const d = new Date(l.log_date)
    const diff = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const streak = last7.length

  const weightHistory = [...checkins].reverse().map(c => c.weight)

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Current Weight', value: latestCheckin ? `${latestCheckin.weight}kg` : '—', sub: `Goal: ${client.goal_weight}kg` },
          { label: 'Goal Progress', value: `${goalProgress}%`, sub: 'of weight goal' },
          { label: '7-Day Log Streak', value: streak.toString(), sub: 'days this week' },
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
              <p>Start: <span className="text-white">{client.start_weight}kg</span></p>
              <p>Current: <span className="text-white">{latestCheckin?.weight || '—'}kg</span></p>
              <p>Goal: <span className="text-gold">{client.goal_weight}kg</span></p>
            </div>
          </div>
        </div>
      )}

      {todayLog && targets && (
        <div className="bg-navy-card border border-white/8 p-6 mb-6">
          <Eyebrow className="block mb-2">Today vs Targets</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-4 mt-4">
            <MetricBar label="Calories" value={todayLog.calories || 0} target={targets.td_calories} unit="kcal" />
            <MetricBar label="Protein" value={todayLog.protein || 0} target={targets.td_protein} unit="g" />
            <MetricBar label="Steps" value={todayLog.steps || 0} target={targets.daily_steps} unit="steps" />
            <MetricBar label="Sleep" value={todayLog.sleep_hours || 0} target={targets.sleep_target_hours} unit="hrs" />
          </div>
        </div>
      )}

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

function DailyLogsTab({ logs }: { logs: DailyLog[] }) {
  const [range, setRange] = useState<7 | 14 | 30>(7)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range)
  const filtered = logs.filter(l => new Date(l.log_date) >= cutoff)

  function getRowStyle(log: DailyLog) {
    const fields = [log.calories, log.protein, log.steps, log.sleep_hours]
    const filled = fields.filter(f => f !== null && f !== undefined).length
    if (filled === 0) return 'border-l-2 border-red-500'
    if (filled < 4) return 'border-l-2 border-amber-500'
    return ''
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {([7, 14, 30] as const).map(d => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`px-4 py-2 text-xs transition-colors ${range === d ? 'bg-gold text-navy-deep' : 'bg-navy-card text-grey-muted hover:text-white'}`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {d} Days
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-grey-muted border-b border-white/8">
              <th className="text-left py-2 font-normal">Date</th>
              <th className="text-left py-2 font-normal">Calories</th>
              <th className="text-left py-2 font-normal">Protein</th>
              <th className="text-left py-2 font-normal">Steps</th>
              <th className="text-left py-2 font-normal">Sleep</th>
              <th className="text-left py-2 font-normal">Energy</th>
              <th className="text-left py-2 font-normal">Stress</th>
              <th className="text-left py-2 font-normal">Training</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} className={`border-b border-white/8 ${getRowStyle(log)}`}>
                <td className="py-2.5 text-white">
                  {new Date(log.log_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                </td>
                <td className="py-2.5 text-white/85">{log.calories ?? '—'}</td>
                <td className="py-2.5 text-white/85">{log.protein ?? '—'}g</td>
                <td className="py-2.5 text-white/85">{log.steps?.toLocaleString() ?? '—'}</td>
                <td className="py-2.5 text-white/85">{log.sleep_hours ?? '—'}hrs</td>
                <td className="py-2.5 text-white/85">{log.energy_score ?? '—'}/5</td>
                <td className="py-2.5 text-white/85">{log.stress_score ?? '—'}/5</td>
                <td className="py-2.5">{log.training_done ? <span className="text-gold">Yes</span> : <span className="text-grey-muted">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CheckInsTab({ clientId, checkins }: { clientId: string; checkins: WeeklyCheckin[] }) {
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(checkins.map(c => [c.id, c.coach_notes || '']))
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})

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

  return (
    <div className="flex flex-col gap-6">
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
              { label: 'Avg Steps', value: checkin.avg_steps },
              { label: 'Biggest Win', value: checkin.biggest_win },
              { label: 'Diet Summary', value: checkin.diet_summary },
              { label: 'Sleep Summary', value: checkin.sleep_summary },
              { label: 'Main Challenge', value: checkin.main_challenge },
              { label: 'Focus Next Week', value: checkin.focus_next_week },
            ].map(item => (
              <div key={item.label}>
                <p className="text-grey-muted mb-0.5">{item.label}</p>
                <p className="text-white/85">{item.value}</p>
              </div>
            ))}
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

      <div className="flex flex-col gap-3">
        {Object.entries(QUESTION_LABELS).map(([key, label]) =>
          responses[key] ? (
            <div key={key} className="bg-navy-card border border-white/8 p-5">
              <p className="text-grey-muted text-xs mb-1.5" style={{ fontFamily: 'var(--font-label)' }}>
                {label.toUpperCase()}
              </p>
              <p className="text-white/85 text-sm">{responses[key]}</p>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

export function ClientDetailTabs({
  client,
  checkins,
  logs,
  programme,
  targets,
  habits,
  trainingMealPlan,
  restMealPlan,
  weekNumber,
}: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const needsApproval = !!client.user_id && !client.portal_access

  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'logs', label: 'Daily Logs' },
    { id: 'checkins', label: 'Check-Ins' },
    { id: 'training', label: 'Training' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'onboarding', label: 'Onboarding', badge: needsApproval },
  ]

  return (
    <div>
      <div className="flex gap-6 border-b border-white/8 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm transition-colors relative ${
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
        <OverviewTab client={client} checkins={checkins} logs={logs} targets={targets} weekNumber={weekNumber} />
      )}
      {activeTab === 'logs' && <DailyLogsTab logs={logs} />}
      {activeTab === 'checkins' && <CheckInsTab clientId={client.id} checkins={checkins} />}
      {activeTab === 'training' && (
        <div className="bg-navy-card border border-white/8 p-6">
          <ProgrammeEditor clientId={client.id} initialProgramme={programme} />
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
            <HabitManager clientId={client.id} initialHabits={habits} />
          </div>
        </div>
      )}
      {activeTab === 'onboarding' && <OnboardingTab client={client} />}
    </div>
  )
}
