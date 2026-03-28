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
      .from('clients').select('id').eq('user_id', user.id).single()
    if (clientRecord?.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: logs, error: fetchError } = await supabase
    .from('session_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: false })
    .limit(20)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(logs)
}
