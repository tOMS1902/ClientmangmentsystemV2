import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PlanTemplatePatchSchema, parseBody } from '@/lib/validation'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(PlanTemplatePatchSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: updated, error: updateError } = await supabase
    .from('weekly_plan_templates')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('coach_id', user.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error: deleteError } = await supabase
    .from('weekly_plan_templates')
    .delete()
    .eq('id', id)
    .eq('coach_id', user.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
