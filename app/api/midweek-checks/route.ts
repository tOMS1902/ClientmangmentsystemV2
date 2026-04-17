import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MidweekCheckSchema, parseBody } from '@/lib/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(MidweekCheckSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, coach_id, start_date')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const weekNumber = Math.max(1, Math.ceil(
    (Date.now() - new Date(clientRecord.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
  ))

  const { data: check, error: insertError } = await supabase
    .from('midweek_checks')
    .insert({
      client_id: clientRecord.id,
      coach_id: clientRecord.coach_id,
      week_number: weekNumber,
      ...parsed.data,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Already submitted this week' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json(check, { status: 201 })
}
