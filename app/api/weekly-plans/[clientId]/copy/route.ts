import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWeekMonday, shiftWeek } from '@/lib/planner'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const targetWeek = body.target_week_start ?? getWeekMonday()
  const sourceWeek = body.source_week_start ?? shiftWeek(targetWeek, -1)

  // Fetch source plan with days and items
  const { data: source } = await supabase
    .from('weekly_plans')
    .select('*, days:weekly_plan_days(*, items:weekly_plan_items(*))')
    .eq('client_id', clientId)
    .eq('week_start_date', sourceWeek)
    .single()

  if (!source) return NextResponse.json({ error: 'No plan found for source week' }, { status: 404 })

  // Check target doesn't already exist
  const { data: existing } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('week_start_date', targetWeek)
    .single()

  if (existing) return NextResponse.json({ error: 'Plan already exists for target week' }, { status: 409 })

  // Create new plan
  const { data: newPlan, error: planError } = await supabase
    .from('weekly_plans')
    .insert({
      client_id: clientId,
      coach_id: user.id,
      week_start_date: targetWeek,
      week_number: (source.week_number ?? 0) + 1,
      coach_message: source.coach_message,
      status: 'draft',
    })
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  // Copy days and items
  for (const day of (source.days ?? [])) {
    const { data: newDay, error: dayError } = await supabase
      .from('weekly_plan_days')
      .insert({
        plan_id: newPlan.id,
        day_of_week: day.day_of_week,
        programme_day_id: day.programme_day_id,
        day_type: day.day_type,
        nutrition_type: day.nutrition_type,
        step_target: day.step_target,
        notes: day.notes,
      })
      .select()
      .single()

    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 })

    if (day.items?.length) {
      const items = day.items.map((item: { item_type: string; title: string; description: string | null; target: string | null; programme_day_id: string | null; sort_order: number }) => ({
        plan_day_id: newDay.id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        target: item.target,
        programme_day_id: item.programme_day_id,
        sort_order: item.sort_order,
        completed: false,
      }))

      const { error: itemsError } = await supabase.from('weekly_plan_items').insert(items)
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // Fetch full new plan
  const { data: full } = await supabase
    .from('weekly_plans')
    .select('*, days:weekly_plan_days(*, items:weekly_plan_items(*))')
    .eq('id', newPlan.id)
    .single()

  return NextResponse.json(full ?? newPlan, { status: 201 })
}
