import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PlanDayPatchSchema, parseBody } from '@/lib/validation'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string; dayId: string }> }
) {
  const { dayId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(PlanDayPatchSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: updated, error: updateError } = await supabase
    .from('weekly_plan_days')
    .update(parsed.data)
    .eq('id', dayId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json(updated)
}
