import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: goals } = await supabase
    .from('client_goals')
    .select('*')
    .eq('client_id', clientId)
    .order('event_date', { ascending: true })

  return NextResponse.json({ goals: goals ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { event_name, event_date } = await req.json()
  if (!event_name?.trim() || !event_date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error: insertError } = await supabase
    .from('client_goals')
    .insert({ client_id: clientId, event_name: event_name.trim(), event_date })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: 'Failed to add goal' }, { status: 500 })
  return NextResponse.json({ goal: data })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { goal_id } = await req.json()
  await supabase.from('client_goals').delete().eq('id', goal_id).eq('client_id', clientId)
  return NextResponse.json({ ok: true })
}
