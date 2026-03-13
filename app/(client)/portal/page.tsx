import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HabitTracker } from '@/components/client/HabitTracker'
import { MetricBar } from '@/components/ui/MetricBar'
import { SparkLine } from '@/components/ui/SparkLine'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import type { Client, DailyLog, WeeklyCheckin, Habit, HabitLog, NutritionTargets } from '@/lib/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!APP_URL) return null
  try {
    const res = await fetch(`${APP_URL}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const firstName = name.split(' ')[0]
  if (hour < 12) return `Good morning, ${firstName}`
  if (hour < 17) return `Good afternoon, ${firstName}`
  return `Good evening, ${firstName}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function calculateStreaks(habits: Habit[], allLogs: HabitLog[]): Record<string, number> {
  const streaks: Record<string, number> = {}
  for (const habit of habits) {
    let streak = 0
    const habitLogs = allLogs
      .filter(l => l.habit_id === habit.id && l.completed)
      .map(l => l.log_date)
      .sort((a, b) => b.localeCompare(a))

    const today = new Date()
    for (let i = 0; i < habitLogs.length; i++) {
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i - 1)
      const expectedStr = expectedDate.toISOString().split('T')[0]
      if (habitLogs[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }
    streaks[habit.id] = streak
  }
  return streaks
}

export default async function PortalHomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return <p className="text-grey-muted">Client record not found.</p>

  const clientId = clientRecord.id
  const today = new Date().toISOString().split('T')[0]

  const [logs, checkins, habits, habitLogData, targets] = await Promise.all([
    fetchJson<DailyLog[]>(`/api/logs/${clientId}?limit=30`),
    fetchJson<WeeklyCheckin[]>(`/api/checkins/${clientId}`),
    fetchJson<Habit[]>(`/api/habits/${clientId}`),
    fetchJson<HabitLog[]>(`/api/habit-logs?clientId=${clientId}&from=${
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }`),
    fetchJson<NutritionTargets>(`/api/nutrition-targets?clientId=${clientId}`),
  ])

  const todayLog = logs?.find(l => l.log_date === today) || null
  const todayHabitLogs = habitLogData?.filter(l => l.log_date === today) || []
  const streaks = calculateStreaks(habits || [], habitLogData || [])

  const last7Logs = logs?.filter(l => {
    const diff = (new Date().getTime() - new Date(l.log_date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }) || []

  const avgCalories = last7Logs.length ? Math.round(last7Logs.reduce((a, l) => a + (l.calories || 0), 0) / last7Logs.length) : 0
  const avgProtein = last7Logs.length ? Math.round(last7Logs.reduce((a, l) => a + (l.protein || 0), 0) / last7Logs.length) : 0
  const avgSteps = last7Logs.length ? Math.round(last7Logs.reduce((a, l) => a + (l.steps || 0), 0) / last7Logs.length) : 0
  const avgSleep = last7Logs.length ? Math.round((last7Logs.reduce((a, l) => a + (l.sleep_hours || 0), 0) / last7Logs.length) * 10) / 10 : 0

  const weightHistory = [...(checkins || [])].reverse().map(c => c.weight)
  const latestCheckin = checkins?.[0] || null

  const dayOfWeek = new Date().toLocaleDateString('en-IE', { weekday: 'long' })
  const isCheckinDay = clientRecord.check_in_day === dayOfWeek

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1
          className="text-3xl text-white mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {getGreeting(clientRecord.full_name)}
        </h1>
        <p className="text-grey-muted">{formatDate(new Date())}</p>
      </div>

      {/* Check-in due banner */}
      {isCheckinDay && !checkins?.find(c => c.check_in_date === today) && (
        <div className="bg-gold/15 border border-gold/30 p-4 mb-6 flex items-center justify-between">
          <p className="text-white/85 text-sm">Your weekly check-in is due today.</p>
          <Link href="/portal/checkin">
            <Button variant="ghost" size="sm">Submit Check-In →</Button>
          </Link>
        </div>
      )}

      {/* Today's log status */}
      <div className={`border p-5 mb-6 ${todayLog ? 'border-green-700' : 'border-gold'}`}>
        {todayLog ? (
          <div>
            <p className="text-sm text-green-400 mb-2" style={{ fontFamily: 'var(--font-label)' }}>TODAY LOGGED</p>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-grey-muted">Calories</p>
                <p className="text-white">{todayLog.calories ?? '—'}</p>
              </div>
              <div>
                <p className="text-grey-muted">Protein</p>
                <p className="text-white">{todayLog.protein ?? '—'}g</p>
              </div>
              <div>
                <p className="text-grey-muted">Steps</p>
                <p className="text-white">{todayLog.steps?.toLocaleString() ?? '—'}</p>
              </div>
              <div>
                <p className="text-grey-muted">Sleep</p>
                <p className="text-white">{todayLog.sleep_hours ?? '—'}hrs</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-white/85">You haven't logged today.</p>
            <Link href="/portal/log">
              <Button variant="primary" size="sm">Log Today →</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Start today's session */}
      <Link href="/portal/programme?day=today">
        <div className="bg-navy-card border border-gold/30 hover:border-gold p-5 mb-8 flex items-center justify-between transition-colors cursor-pointer">
          <span className="text-white" style={{ fontFamily: 'var(--font-label)' }}>Start Today's Session</span>
          <span className="text-gold">→</span>
        </div>
      </Link>

      {/* This week's targets */}
      {targets && (
        <div className="bg-navy-card border border-white/8 p-6 mb-8">
          <Eyebrow>This Week's Targets</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-4 mt-4">
            <MetricBar label="Avg Calories" value={avgCalories} target={targets.td_calories} unit="kcal" />
            <MetricBar label="Avg Protein" value={avgProtein} target={targets.td_protein} unit="g" />
            <MetricBar label="Avg Steps" value={avgSteps} target={targets.daily_steps} unit="steps" />
            <MetricBar label="Avg Sleep" value={avgSleep} target={targets.sleep_target_hours} unit="hrs" />
          </div>
        </div>
      )}

      {/* Habit tracker */}
      <div className="bg-navy-card border border-white/8 p-6 mb-8">
        <HabitTracker
          habits={habits || []}
          todayLogs={todayHabitLogs}
          streaks={streaks}
        />
      </div>

      {/* Weight trend */}
      {weightHistory.length > 1 && (
        <div className="bg-navy-card border border-white/8 p-6">
          <Eyebrow>Weight Trend</Eyebrow>
          <GoldRule />
          <div className="flex items-end gap-8 mt-4">
            <SparkLine data={weightHistory} width={200} height={50} />
            <div className="text-sm">
              <p className="text-3xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {latestCheckin?.weight ?? '—'}kg
              </p>
              <p className="text-grey-muted text-xs">Goal: {clientRecord.goal_weight}kg</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
