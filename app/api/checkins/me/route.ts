import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: checkins, error: fetchError } = await supabase
    .from('weekly_checkins')
    .select('*')
    .eq('client_id', clientRecord.id)
    .order('week_number', { ascending: false })

  if (fetchError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(checkins)
}
