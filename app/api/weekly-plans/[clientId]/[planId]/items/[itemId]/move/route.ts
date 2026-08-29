import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PlanItemMoveSchema, parseBody } from '@/lib/validation'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string; itemId: string }> }
) {
  const { planId, itemId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(PlanItemMoveSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Get original item to record the source day
  const { data: item } = await supabase
    .from('weekly_plan_items')
    .select('plan_day_id, title')
    .eq('id', itemId)
    .single()

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // Get original day_of_week
  const { data: origDay } = await supabase
    .from('weekly_plan_days')
    .select('day_of_week')
    .eq('id', item.plan_day_id)
    .single()

  const { data: updated, error: updateError } = await supabase
    .from('weekly_plan_items')
    .update({
      plan_day_id: parsed.data.target_day_id,
      moved_from_day: origDay?.day_of_week ?? null,
      moved_by: parsed.data.moved_by,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Log the change
  await supabase.from('weekly_plan_changes').insert({
    plan_id: planId,
    changed_by: user.id,
    change_type: 'move',
    description: `Moved "${item.title}" from day ${origDay?.day_of_week ?? '?'}`,
    metadata: { item_id: itemId, from_day: origDay?.day_of_week, to_day_id: parsed.data.target_day_id },
  })

  return NextResponse.json(updated)
}
