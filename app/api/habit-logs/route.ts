import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { habit_id, completed } = await request.json()
  const today = new Date().toISOString().split('T')[0]

  const { data: clientRecord } = await supabase
    .from('clients').select('id').eq('user_id', user.id).single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const { data: log, error: upsertError } = await supabase
    .from('habit_logs')
    .upsert(
      { habit_id, client_id: clientRecord.id, log_date: today, completed },
      { onConflict: 'habit_id,log_date' }
    )
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(log)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const from = searchParams.get('from')

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  // Verify caller owns or manages this client
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role === 'coach') {
    const { data: owned } = await supabase.from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
    if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (callerProfile?.role === 'client') {
    const { data: owned } = await supabase.from('clients').select('id').eq('user_id', user.id).single()
    if (!owned || owned.id !== clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('habit_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: false })

  if (from) query = query.gte('log_date', from)

  const { data: logs, error: fetchError } = await query
  if (fetchError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(logs)
}
