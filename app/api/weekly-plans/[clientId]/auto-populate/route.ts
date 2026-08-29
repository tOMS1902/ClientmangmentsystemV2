import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildPlanFromProgramme } from '@/lib/planner'

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
  const planId = body.plan_id
  const dayMapping = body.day_mapping // optional Record<number, string>

  if (!planId) return NextResponse.json({ error: 'plan_id required' }, { status: 400 })

  // Get active programme for client
  const { data: programme } = await supabase
    .from('programmes')
    .select('*, days:programme_days(*, exercises(*))')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!programme) return NextResponse.json({ error: 'No active programme found' }, { status: 404 })

  const planDays = buildPlanFromProgramme(programme.days ?? [], dayMapping)

  // Get existing plan days
  const { data: existingDays } = await supabase
    .from('weekly_plan_days')
    .select('id, day_of_week')
    .eq('plan_id', planId)

  if (!existingDays?.length) return NextResponse.json({ error: 'Plan days not found' }, { status: 404 })

  // Update each day and add items
  for (const pd of planDays) {
    const existingDay = existingDays.find(d => d.day_of_week === pd.day_of_week)
    if (!existingDay) continue

    await supabase
      .from('weekly_plan_days')
      .update({
        day_type: pd.day_type,
        nutrition_type: pd.nutrition_type,
        programme_day_id: pd.programme_day_id,
      })
      .eq('id', existingDay.id)

    if (pd.items.length > 0) {
      const items = pd.items.map(item => ({
        plan_day_id: existingDay.id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        target: item.target,
        programme_day_id: item.programme_day_id,
        sort_order: item.sort_order,
      }))

      await supabase.from('weekly_plan_items').insert(items)
    }
  }

  // Fetch updated plan
  const { data: full } = await supabase
    .from('weekly_plans')
    .select('*, days:weekly_plan_days(*, items:weekly_plan_items(*))')
    .eq('id', planId)
    .single()

  return NextResponse.json(full)
}
