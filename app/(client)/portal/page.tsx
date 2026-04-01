import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HabitTracker } from '@/components/client/HabitTracker'
import { SparkLine } from '@/components/ui/SparkLine'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import type { WeeklyCheckin, Habit, HabitLog, MidweekCheck } from '@/lib/types'


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

function trackStatusLabel(v: string) {
  if (v === 'yes') return 'On track'
  if (v === 'slightly_off') return 'Slightly off'
  return 'Off track'
}
function trackStatusColor(v: string) {
  if (v === 'yes') return 'text-green-400'
  if (v === 'slightly_off') return 'text-amber-400'
  return 'text-red-400'
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
  const from14Days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: checkins },
    { data: midweekChecks },
    { data: habits },
    { data: habitLogData },
  ] = await Promise.all([
    supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('check_in_date', { ascending: false }),
    supabase.from('midweek_checks').select('*').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(10),
    supabase.from('habits').select('*').eq('client_id', clientId).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('client_id', clientId).gte('log_date', from14Days),
  ])

  const todayHabitLogs = habitLogData?.filter(l => l.log_date === today) || []
  const streaks = calculateStreaks(habits || [], habitLogData || [])

  const weightHistory = [...(checkins || [])].reverse().map(c => c.weight)
  const latestCheckin = checkins?.[0] || null

  const dayOfWeek = new Date().toLocaleDateString('en-IE', { weekday: 'long' })
  const isCheckinDay = clientRecord.check_in_day === dayOfWeek
  const isMidweekDay = clientRecord.midweek_check_day
    ? dayOfWeek === clientRecord.midweek_check_day
    : dayOfWeek === 'Wednesday'

  // Midweek check — submitted within the last 7 days?
  const thisWeekMidweek = (midweekChecks as MidweekCheck[] | null)?.find(c => {
    const diff = (Date.now() - new Date(c.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }) || null

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

      {/* Weekly check-in due banner */}
      {isCheckinDay && !checkins?.find(c => c.check_in_date === today) && (
        <div className="bg-gold/15 border border-gold/30 p-4 mb-6 flex items-center justify-between">
          <p className="text-white/85 text-sm">Your weekly check-in is due today.</p>
          <Link href="/portal/checkin">
            <Button variant="ghost" size="sm">Submit Check-In →</Button>
          </Link>
        </div>
      )}

      {/* Midweek check widget */}
      {thisWeekMidweek ? (
        <div className="border border-green-700 p-5 mb-6">
          <p className="text-xs text-green-400 mb-3" style={{ fontFamily: 'var(--font-label)' }}>MIDWEEK CHECK — SUBMITTED</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-grey-muted text-xs mb-0.5">Training</p>
              <p className={trackStatusColor(thisWeekMidweek.training_on_track)}>{trackStatusLabel(thisWeekMidweek.training_on_track)}</p>
            </div>
            <div>
              <p className="text-grey-muted text-xs mb-0.5">Food</p>
              <p className={trackStatusColor(thisWeekMidweek.food_on_track)}>{trackStatusLabel(thisWeekMidweek.food_on_track)}</p>
            </div>
            <div>
              <p className="text-grey-muted text-xs mb-0.5">Energy</p>
              <p className="text-white">{thisWeekMidweek.energy_level}/5</p>
            </div>
          </div>
          {thisWeekMidweek.biggest_blocker && (
            <p className="text-grey-muted text-xs mt-3">{thisWeekMidweek.biggest_blocker}</p>
          )}
        </div>
      ) : isMidweekDay ? (
        <div className="bg-gold/15 border border-gold/30 p-4 mb-6 flex items-center justify-between">
          <p className="text-white/85 text-sm">Quick one — how are things going this week?</p>
          <Link href="/portal/checkin/midweek">
            <Button variant="primary" size="sm">Check In →</Button>
          </Link>
        </div>
      ) : null}

      {/* Start today's session */}
      <Link href="/portal/programme?day=today">
        <div className="bg-navy-card border border-gold/30 hover:border-gold p-5 mb-8 flex items-center justify-between transition-colors cursor-pointer">
          <span className="text-white" style={{ fontFamily: 'var(--font-label)' }}>Start Today's Session</span>
          <span className="text-gold">→</span>
        </div>
      </Link>

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
