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

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const { data: checks } = await supabase
    .from('midweek_checks')
    .select('*')
    .eq('client_id', clientRecord.id)
    .order('submitted_at', { ascending: false })

  return NextResponse.json(checks ?? [])
}
