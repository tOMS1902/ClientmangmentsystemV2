import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Client-only: resolves the current user's client_id
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, coach_id')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })
  return NextResponse.json({ clientId: clientRecord.id, coachId: clientRecord.coach_id })
}
