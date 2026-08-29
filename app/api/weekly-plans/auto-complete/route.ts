import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWeekMonday } from '@/lib/planner'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { programme_day_id, session_log_id } = body

  if (!programme_day_id) return NextResponse.json({ error: 'programme_day_id required' }, { status: 400 })

  const weekStart = getWeekMonday()

  // Find client for this user
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) return NextResponse.json({ ok: false })

  // Find current week's plan
  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('client_id', client.id)
    .eq('week_start_date', weekStart)
    .single()

  if (!plan) return NextResponse.json({ ok: false })

  // Find matching uncompleted item
  const { data: items } = await supabase
    .from('weekly_plan_items')
    .select('id, plan_day_id, title')
    .eq('programme_day_id', programme_day_id)
    .eq('completed', false)

  if (!items?.length) return NextResponse.json({ ok: false })

  // Filter to items belonging to this plan
  const { data: planDays } = await supabase
    .from('weekly_plan_days')
    .select('id')
    .eq('plan_id', plan.id)

  const planDayIds = new Set((planDays ?? []).map(d => d.id))
  const matchingItem = items.find(i => planDayIds.has(i.plan_day_id))

  if (!matchingItem) return NextResponse.json({ ok: false })

  // Mark complete
  await supabase
    .from('weekly_plan_items')
    .update({
      completed: true,
      completed_by: 'auto',
      completed_at: new Date().toISOString(),
      session_log_id: session_log_id ?? null,
    })
    .eq('id', matchingItem.id)

  // Log change
  await supabase.from('weekly_plan_changes').insert({
    plan_id: plan.id,
    changed_by: user.id,
    change_type: 'complete',
    description: `Auto-completed "${matchingItem.title}" via session log`,
    metadata: { item_id: matchingItem.id, auto: true, session_log_id },
  })

  return NextResponse.json({ ok: true, item_id: matchingItem.id })
}
