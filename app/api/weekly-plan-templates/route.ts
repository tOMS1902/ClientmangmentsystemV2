import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PlanTemplateCreateSchema, parseBody } from '@/lib/validation'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: templates } = await supabase
    .from('weekly_plan_templates')
    .select('*')
    .eq('coach_id', user.id)
    .order('updated_at', { ascending: false })

  return NextResponse.json(templates ?? [])
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(PlanTemplateCreateSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: template, error: insertError } = await supabase
    .from('weekly_plan_templates')
    .insert({ ...parsed.data, coach_id: user.id })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json(template, { status: 201 })
}
