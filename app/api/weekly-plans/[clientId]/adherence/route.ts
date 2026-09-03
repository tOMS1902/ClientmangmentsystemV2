import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWeekMonday } from '@/lib/planner'

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const weekStart = url.searchParams.get('week_start') ?? getWeekMonday()

  // Find the plan for this week
  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('week_start_date', weekStart)
    .single()

  if (!plan) {
    return NextResponse.json({
      training_done: 0, training_total: 0,
      nutrition_done: 0, nutrition_total: 0,
      steps_done: 0, steps_total: 0,
    })
  }

  // Get all items for this plan via days
  const { data: days } = await supabase
    .from('weekly_plan_days')
    .select('id')
    .eq('plan_id', plan.id)

  if (!days || days.length === 0) {
    return NextResponse.json({
      training_done: 0, training_total: 0,
      nutrition_done: 0, nutrition_total: 0,
      steps_done: 0, steps_total: 0,
    })
  }

  const dayIds = days.map(d => d.id)

  const { data: items } = await supabase
    .from('weekly_plan_items')
    .select('item_type, completed')
    .in('plan_day_id', dayIds)

  if (!items) {
    return NextResponse.json({
      training_done: 0, training_total: 0,
      nutrition_done: 0, nutrition_total: 0,
      steps_done: 0, steps_total: 0,
    })
  }

  // Count by type (training includes training+cardio for adherence purposes)
  const training = items.filter(i => i.item_type === 'training' || i.item_type === 'cardio')
  const nutrition = items.filter(i => i.item_type === 'nutrition')
  const steps = items.filter(i => i.item_type === 'steps')

  return NextResponse.json({
    training_done: training.filter(i => i.completed).length,
    training_total: training.length,
    nutrition_done: nutrition.filter(i => i.completed).length,
    nutrition_total: nutrition.length,
    steps_done: steps.filter(i => i.completed).length,
    steps_total: steps.length,
  })
}
