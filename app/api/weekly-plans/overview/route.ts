import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWeekMonday } from '@/lib/planner'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const weekStart = url.searchParams.get('week_start') ?? getWeekMonday()

  // Get all plans for this coach's clients this week
  const { data: plans } = await supabase
    .from('weekly_plans')
    .select(`
      id, client_id, status, week_number,
      days:weekly_plan_days(
        id, day_type,
        items:weekly_plan_items(id, item_type, completed)
      )
    `)
    .eq('coach_id', user.id)
    .eq('week_start_date', weekStart)

  // Get client names
  const clientIds = [...new Set((plans ?? []).map(p => p.client_id))]
  const { data: clients } = clientIds.length > 0
    ? await supabase.from('clients').select('id, full_name').in('id', clientIds)
    : { data: [] }

  const clientMap = new Map((clients ?? []).map(c => [c.id, c.full_name]))

  const overview = (plans ?? []).map(plan => {
    const allItems = (plan.days ?? []).flatMap((d: { items?: { id: string; item_type: string; completed: boolean }[] }) => d.items ?? [])
    const trainingItems = allItems.filter((i: { item_type: string }) => i.item_type === 'training')
    const stepsItems = allItems.filter((i: { item_type: string }) => i.item_type === 'steps')
    const nutritionItems = allItems.filter((i: { item_type: string }) => i.item_type === 'nutrition')

    const pct = (items: { completed: boolean }[]) =>
      items.length === 0 ? null : Math.round((items.filter(i => i.completed).length / items.length) * 100)

    const totalCompleted = allItems.filter((i: { completed: boolean }) => i.completed).length
    const overallPct = allItems.length === 0 ? null : Math.round((totalCompleted / allItems.length) * 100)

    return {
      client_id: plan.client_id,
      client_name: clientMap.get(plan.client_id) ?? 'Unknown',
      plan_id: plan.id,
      status: plan.status,
      week_number: plan.week_number,
      training_pct: pct(trainingItems),
      steps_pct: pct(stepsItems),
      nutrition_pct: pct(nutritionItems),
      overall_pct: overallPct,
      total_items: allItems.length,
      completed_items: totalCompleted,
    }
  })

  return NextResponse.json(overview)
}
