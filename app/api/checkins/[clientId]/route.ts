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
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (clientRecord?.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (profile?.role === 'coach') {
    const { data: clientRecord } = await supabase
      .from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: checkins, error: fetchError } = await supabase
    .from('weekly_checkins')
    .select('*')
    .eq('client_id', clientId)
    .order('week_number', { ascending: false })

  if (fetchError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(checkins)
}

const EDITABLE_FIELDS = [
  'weight', 'week_score', 'diet_rating', 'training_completed',
  'energy_score', 'sleep_score', 'hunger_score', 'cravings_score',
  'avg_steps', 'biggest_win', 'main_challenge', 'improve_next_week',
  'coach_support', 'anything_else', 'focus_areas', 'coach_notes',
]

export async function PATCH(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  // The param here is the check-in UUID (weekly_checkins.id)
  const { clientId: checkinId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify the check-in exists
  const { data: checkinRecord } = await supabase
    .from('weekly_checkins')
    .select('id, client_id')
    .eq('id', checkinId)
    .single()

  if (!checkinRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify the check-in belongs to one of this coach's clients
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('id', checkinRecord.client_id)
    .eq('coach_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { data: updatedCheckin, error: updateError } = await supabase
    .from('weekly_checkins')
    .update(update)
    .eq('id', checkinId)
    .select()
    .single()

  if (updateError) {
    console.error('[checkins/patch]', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json(updatedCheckin)
}
