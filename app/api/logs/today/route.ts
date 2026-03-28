import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clientRecord } = await supabase
    .from('clients').select('id').eq('user_id', user.id).single()
  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  const { data: log } = await supabase
    .from('daily_logs').select('*')
    .eq('client_id', clientRecord.id)
    .eq('log_date', today)
    .maybeSingle()

  return NextResponse.json(log)
}
