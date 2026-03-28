import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  const { data: clientRecord } = await supabase
    .from('clients').select('id').eq('user_id', user.id).single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const { data: sessionLog, error: insertError } = await supabase
    .from('session_logs')
    .insert({ ...body, client_id: clientRecord.id })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Also mark training_done = true in today's daily log
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('daily_logs')
    .upsert(
      { client_id: clientRecord.id, log_date: today, training_done: true },
      { onConflict: 'client_id,log_date' }
    )

  return NextResponse.json(sessionLog, { status: 201 })
}
