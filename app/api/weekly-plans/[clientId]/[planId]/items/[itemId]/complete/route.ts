import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string; itemId: string }> }
) {
  const { planId, itemId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const completedBy = profile?.role === 'coach' ? 'coach' : 'client'

  const body = await request.json().catch(() => ({}))
  const completed = body.completed !== false

  const { data: updated, error: updateError } = await supabase
    .from('weekly_plan_items')
    .update({
      completed,
      completed_by: completed ? completedBy : null,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Log the change
  await supabase.from('weekly_plan_changes').insert({
    plan_id: planId,
    changed_by: user.id,
    change_type: 'complete',
    description: `${completed ? 'Completed' : 'Uncompleted'} "${updated.title}"`,
    metadata: { item_id: itemId, completed },
  })

  return NextResponse.json(updated)
}
