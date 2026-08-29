import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PlanItemCreateSchema, parseBody } from '@/lib/validation'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string }> }
) {
  await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(PlanItemCreateSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: item, error: insertError } = await supabase
    .from('weekly_plan_items')
    .insert(parsed.data)
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json(item, { status: 201 })
}
