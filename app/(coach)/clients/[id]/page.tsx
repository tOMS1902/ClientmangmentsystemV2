import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ClientDetailTabs } from './ClientDetailTabs'
import type { Client, WeeklyCheckin, DailyLog, Programme, NutritionTargets, Habit, MealPlan } from '@/lib/types'

function getWeekNumber(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  return Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [
    { data: client },
    { data: checkins },
    { data: logs },
    { data: programmes },
    { data: targets },
    { data: habits },
    { data: trainingMealPlan },
    { data: restMealPlan },
    { count: unreadMessages },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single<Client>(),
    supabase.from('weekly_checkins').select('*').eq('client_id', id).order('check_in_date', { ascending: false }),
    supabase.from('daily_logs').select('*').eq('client_id', id).order('log_date', { ascending: false }).limit(30),
    supabase
      .from('programmes')
      .select('*, days:programme_days(*, exercises(*))')
      .eq('client_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase.from('nutrition_targets').select('*').eq('client_id', id).maybeSingle<NutritionTargets>(),
    supabase.from('habits').select('*').eq('client_id', id).eq('is_active', true).order('created_at'),
    supabase.from('meal_plans').select('*').eq('client_id', id).eq('day_type', 'training').eq('is_active', true).maybeSingle<MealPlan>(),
    supabase.from('meal_plans').select('*').eq('client_id', id).eq('day_type', 'rest').eq('is_active', true).maybeSingle<MealPlan>(),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id)
      .eq('sender_role', 'client')
      .eq('is_read', false),
  ])

  if (!client) {
    return <div className="text-grey-muted">Client not found.</div>
  }

  const weekNumber = getWeekNumber(client.start_date)
  const latestCheckin = (checkins as WeeklyCheckin[] | null)?.[0] || null

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1
            className="text-3xl text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {client.full_name}
          </h1>
          <span className="eyebrow px-3 py-1 bg-navy-card border border-gold/30">
            Week {weekNumber}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-grey-muted">
          <span>Started {new Date(client.start_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          {latestCheckin && (
            <span>Current weight: <span className="text-white">{latestCheckin.weight}kg</span></span>
          )}
          <span>Goal: <span className="text-white">{client.goal_weight}kg</span></span>
        </div>
      </div>

      <ClientDetailTabs
        client={client}
        checkins={(checkins as WeeklyCheckin[]) || []}
        logs={(logs as DailyLog[]) || []}
        programmes={(programmes as Programme[]) || []}
        targets={targets as NutritionTargets | null}
        habits={(habits as Habit[]) || []}
        trainingMealPlan={trainingMealPlan as MealPlan | null}
        restMealPlan={restMealPlan as MealPlan | null}
        weekNumber={weekNumber}
        unreadMessages={unreadMessages ?? 0}
      />
    </div>
  )
}
