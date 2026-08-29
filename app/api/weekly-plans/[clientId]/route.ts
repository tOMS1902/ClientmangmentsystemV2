import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { WeeklyPlanCreateSchema, WeeklyPlanPatchSchema, parseBody } from '@/lib/validation'
import { getWeekMonday } from '@/lib/planner'

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const weekStart = url.searchParams.get('week_start') ?? getWeekMonday()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isClient = profile?.role === 'client'

  let query = supabase
    .from('weekly_plans')
    .select('*, days:weekly_plan_days(*, items:weekly_plan_items(*))')
    .eq('client_id', clientId)
    .eq('week_start_date', weekStart)

  if (isClient) query = query.eq('status', 'published')

  const { data: plan } = await query.single()

  if (!plan) return NextResponse.json(null)

  // Sort days by day_of_week, items by sort_order
  if (plan.days) {
    plan.days.sort((a: { day_of_week: number }, b: { day_of_week: number }) => a.day_of_week - b.day_of_week)
    for (const day of plan.days) {
      if (day.items) {
        day.items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      }
    }
  }

  return NextResponse.json(plan)
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
  if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(WeeklyPlanCreateSchema, { ...(await request.json()), client_id: clientId })
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { week_start_date, week_number, coach_message, status } = parsed.data

  // Check for existing plan
  const { data: existing } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('week_start_date', week_start_date)
    .single()

  if (existing) return NextResponse.json({ error: 'Plan already exists for this week' }, { status: 409 })

  const { data: plan, error: insertError } = await supabase
    .from('weekly_plans')
    .insert({
      client_id: clientId,
      coach_id: user.id,
      week_start_date,
      week_number: week_number ?? 1,
      coach_message: coach_message ?? null,
      status,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Create 7 empty days
  const days = Array.from({ length: 7 }, (_, i) => ({
    plan_id: plan.id,
    day_of_week: i,
    day_type: 'rest' as const,
    nutrition_type: 'rest' as const,
  }))

  const { error: daysError } = await supabase.from('weekly_plan_days').insert(days)
  if (daysError) return NextResponse.json({ error: daysError.message }, { status: 500 })

  // Fetch full plan with days
  const { data: full } = await supabase
    .from('weekly_plans')
    .select('*, days:weekly_plan_days(*, items:weekly_plan_items(*))')
    .eq('id', plan.id)
    .single()

  return NextResponse.json(full ?? plan, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { plan_id, ...rest } = body

  const parsed = parseBody(WeeklyPlanPatchSchema, rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: updated, error: updateError } = await supabase
    .from('weekly_plans')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', plan_id)
    .eq('client_id', clientId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json(updated)
}
