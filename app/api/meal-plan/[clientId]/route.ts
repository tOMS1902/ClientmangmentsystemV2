import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'client') {
    const { data: clientRecord } = await supabase
      .from('clients').select('id').eq('user_id', user.id).single()
    if (clientRecord?.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: plans, error: fetchError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (fetchError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  return NextResponse.json({ plans: plans ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { data: plan, error: upsertError } = await supabase
    .from('meal_plans')
    .upsert({ ...body, client_id: clientId }, { onConflict: 'client_id,day_type' })
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(plan)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { day_type } = await request.json()
  if (!day_type) return NextResponse.json({ error: 'day_type is required' }, { status: 400 })

  await supabase.from('meal_plans').delete().eq('client_id', clientId).eq('day_type', day_type)
  return NextResponse.json({ ok: true })
}
