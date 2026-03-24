import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DailyLogSchema, parseBody } from '@/lib/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(DailyLogSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]
  if (parsed.data.log_date > today) {
    return NextResponse.json({ error: 'Cannot log future dates' }, { status: 400 })
  }

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const { data: log, error: upsertError } = await supabase
    .from('daily_logs')
    .upsert({ ...parsed.data, client_id: clientRecord.id }, { onConflict: 'client_id,log_date' })
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  return NextResponse.json(log, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(DailyLogSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const { data: log, error: updateError } = await supabase
    .from('daily_logs')
    .update(parsed.data)
    .eq('client_id', clientRecord.id)
    .eq('log_date', parsed.data.log_date ?? new Date().toISOString().split('T')[0])
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json(log)
}
