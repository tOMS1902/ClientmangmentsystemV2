import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SparkLine } from '@/components/ui/SparkLine'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { GoalCountdown } from '@/components/client/portal/GoalCountdown'
import { NextCallWidget } from '@/components/client/portal/NextCallWidget'
import { BadgeWall } from '@/components/client/portal/BadgeWall'
import { displayWeight, unitLabel, type WeightUnit } from '@/lib/units'
import type { Client, WeeklyCheckin, Habit, HabitLog, MidweekCheck } from '@/lib/types'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
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

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/portal')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single<Client>()

  if (!client) return <div className="text-grey-muted p-8">Client not found or not yours.</div>

  const today = new Date().toISOString().split('T')[0]
  const from14Days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: checkins },
    { data: midweekChecks },
    { data: habits },
    { data: habitLogData },
    { data: loomVideos },
    { data: milestonesData },
    { data: goalsData },
  ] = await Promise.all([
    supabase.from('weekly_checkins').select('*').eq('client_id', id).order('check_in_date', { ascending: false }),
    supabase.from('midweek_checks').select('*').eq('client_id', id).order('submitted_at', { ascending: false }).limit(5),
    supabase.from('habits').select('*').eq('client_id', id).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('client_id', id).gte('log_date', from14Days),
    supabase.from('weekly_loom_videos').select('*').eq('client_id', id).order('week_number', { ascending: false }).limit(5),
    supabase.from('client_milestones').select('id, label, is_unlocked').eq('client_id', id).order('display_order', { ascending: true }),
    supabase.from('client_goals').select('*').eq('client_id', id).order('event_date', { ascending: true }),
  ])

  const unit: WeightUnit = client.weight_unit === 'lbs' ? 'lbs' : 'kg'
  const ul = unitLabel(unit)
  const latestCheckin = (checkins as WeeklyCheckin[] | null)?.[0] || null
  const weightHistory = [...(checkins || [])].reverse().map(c => displayWeight(c.weight, unit))
  const todayHabitLogs = (habitLogData as HabitLog[] || []).filter(l => l.log_date === today)
  const milestones = (milestonesData ?? []) as { id: string; label: string; is_unlocked: boolean }[]

  const thisWeekMidweek = (midweekChecks as MidweekCheck[] | null)?.find(c => {
    const diff = (Date.now() - new Date(c.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }) || null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Preview banner */}
      <div className="sticky top-0 z-40 bg-gold text-navy-dark px-4 py-3 flex items-center justify-between mb-6">
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-label)' }}>
          PREVIEWING {client.full_name.toUpperCase()}&apos;S PORTAL
        </p>
        <Link
          href={`/clients/${id}`}
          className="text-xs underline hover:no-underline"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          Exit Preview
        </Link>
      </div>

      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-3xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Good morning, {client.full_name.split(' ')[0]}
        </h1>
        <p className="text-grey-muted">{formatDate(new Date())}</p>
      </div>

      {/* Goal countdowns */}
      {(goalsData ?? []).length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {(goalsData as { id: string; event_name: string; event_date: string }[]).map(goal => (
            <GoalCountdown key={goal.id} goalEventName={goal.event_name} goalEventDate={goal.event_date} />
          ))}
        </div>
      )}
      {!(goalsData ?? []).length && !!(client.goal_event_name || client.goal_weight) && (
        <div className="mb-6">
          <GoalCountdown
            goalEventName={client.goal_event_name}
            goalEventDate={client.goal_event_date}
            goalWeight={client.goal_weight}
            currentWeight={latestCheckin?.weight != null ? latestCheckin.weight : (client.current_weight ?? undefined)}
          />
        </div>
      )}

      {/* Next Call */}
      {client.next_call_at && (
        <NextCallWidget
          nextCallAt={client.next_call_at}
          nextCallLink={client.next_call_link}
          nextCallNotes={client.next_call_notes}
        />
      )}

      {/* Midweek check summary */}
      {thisWeekMidweek && (
        <div className="border border-green-700 p-5 mb-6">
          <p className="text-xs text-green-400 mb-3" style={{ fontFamily: 'var(--font-label)' }}>MIDWEEK CHECK — SUBMITTED</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {thisWeekMidweek.training_on_track && (
              <div>
                <p className="text-grey-muted text-xs mb-0.5">Training</p>
                <p className={trackStatusColor(thisWeekMidweek.training_on_track)}>{trackStatusLabel(thisWeekMidweek.training_on_track)}</p>
              </div>
            )}
            {thisWeekMidweek.food_on_track && (
              <div>
                <p className="text-grey-muted text-xs mb-0.5">Food</p>
                <p className={trackStatusColor(thisWeekMidweek.food_on_track)}>{trackStatusLabel(thisWeekMidweek.food_on_track)}</p>
              </div>
            )}
            {thisWeekMidweek.energy_level != null && (
              <div>
                <p className="text-grey-muted text-xs mb-0.5">Energy</p>
                <p className="text-white">{thisWeekMidweek.energy_level}/5</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Habits */}
      {(habits || []).length > 0 && (
        <div className="bg-navy-card border border-white/8 p-6 mb-8">
          <Eyebrow className="block mb-3">Today&apos;s Habits</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-2 mt-4">
            {(habits as Habit[]).map(habit => {
              const done = todayHabitLogs.some(l => l.habit_id === habit.id && l.completed)
              return (
                <div key={habit.id} className="flex items-center gap-3 py-2 border-b border-white/8 last:border-0">
                  <span className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${done ? 'border-gold bg-gold/20' : 'border-white/20'}`}>
                    {done && <span className="text-gold text-xs">✓</span>}
                  </span>
                  <div>
                    <p className="text-white text-sm">{habit.name}</p>
                    {habit.description && <p className="text-grey-muted text-xs">{habit.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weight trend */}
      {weightHistory.length > 1 && (
        <div className="bg-navy-card border border-white/8 p-6 mb-8">
          <Eyebrow>Weight Trend</Eyebrow>
          <GoldRule />
          <div className="flex items-end gap-8 mt-4">
            <SparkLine data={weightHistory} width={200} height={50} />
            <div className="text-sm">
              <p className="text-3xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {latestCheckin?.weight != null ? displayWeight(latestCheckin.weight, unit) : '—'}{ul}
              </p>
              <p className="text-grey-muted text-xs">Goal: {client.goal_weight != null ? displayWeight(client.goal_weight, unit) : '—'}{ul}</p>
            </div>
          </div>
        </div>
      )}

      {/* Badge wall */}
      <div className="mb-8">
        <BadgeWall milestones={milestones} />
      </div>

      {/* Loom videos */}
      {(loomVideos ?? []).length > 0 && (
        <div className="bg-navy-card border border-white/8 p-6 mb-8">
          <Eyebrow>Coach Videos</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-2 mt-4">
            {(loomVideos as { id: string; loom_url: string; week_number: number }[]).map(v => (
              <a
                key={v.id}
                href={v.loom_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gold hover:underline"
              >
                Week {v.week_number} video →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
