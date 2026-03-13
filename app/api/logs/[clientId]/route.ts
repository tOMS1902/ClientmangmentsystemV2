import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '30')

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Clients can only see their own logs
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

  let query = supabase
    .from('daily_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('log_date', from)
  if (to) query = query.lte('log_date', to)

  const { data: logs, error: fetchError } = await query
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(logs)
}
