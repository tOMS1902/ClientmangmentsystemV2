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
    .from('clients')
    .select('id, start_date')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  // Calculate week number from start_date
  const startDate = new Date(clientRecord.start_date)
  const today = new Date()
  const weekNumber = Math.ceil((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

  // Check for duplicate
  const { data: existing } = await supabase
    .from('weekly_checkins')
    .select('id')
    .eq('client_id', clientRecord.id)
    .eq('week_number', weekNumber)
    .single()

  if (existing) return NextResponse.json({ error: 'Check-in already submitted for this week' }, { status: 409 })

  const { data: checkin, error: insertError } = await supabase
    .from('weekly_checkins')
    .insert({
      ...body,
      client_id: clientRecord.id,
      week_number: weekNumber,
      check_in_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json(checkin, { status: 201 })
}
