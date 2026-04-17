import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface LogEntry {
  exercise_id: string
  weight_kg: number
  reps_completed: number
  set_number: number
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { client_id, entries } = body as { client_id: string; entries: LogEntry[] }

  if (!client_id || !entries?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify coach owns this client
  const { data: clientRecord } = await supabase
    .from('clients').select('id').eq('id', client_id).eq('coach_id', user.id).single()
  if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = new Date().toISOString().split('T')[0]

  const rows = entries.map(e => ({
    client_id,
    exercise_id: e.exercise_id,
    log_date: today,
    set_number: e.set_number,
    weight_kg: e.weight_kg,
    reps_completed: e.reps_completed,
  }))

  const { data: saved, error: upsertError } = await supabase
    .from('logbook_entries')
    .upsert(rows, { onConflict: 'client_id,exercise_id,log_date,set_number' })
    .select()

  if (upsertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  return NextResponse.json(saved, { status: 200 })
}
