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
  }

  const { data: checkins, error: fetchError } = await supabase
    .from('weekly_checkins')
    .select('*')
    .eq('client_id', clientId)
    .order('week_number', { ascending: false })

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(checkins)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  // When called as PATCH /api/checkins/[checkinId], the param is the check-in ID
  const { clientId: checkinId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { coach_notes } = await request.json()
  const { data: checkin, error: updateError } = await supabase
    .from('weekly_checkins')
    .update({ coach_notes })
    .eq('id', checkinId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json(checkin)
}
