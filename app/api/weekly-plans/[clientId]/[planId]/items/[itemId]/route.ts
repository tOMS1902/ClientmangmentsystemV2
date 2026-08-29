import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PlanItemPatchSchema, parseBody } from '@/lib/validation'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string; itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(PlanItemPatchSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const updateData = { ...parsed.data } as Record<string, unknown>
  if (parsed.data.completed) {
    updateData.completed_at = new Date().toISOString()
  }

  const { data: updated, error: updateError } = await supabase
    .from('weekly_plan_items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string; itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: deleteError } = await supabase
    .from('weekly_plan_items')
    .delete()
    .eq('id', itemId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
