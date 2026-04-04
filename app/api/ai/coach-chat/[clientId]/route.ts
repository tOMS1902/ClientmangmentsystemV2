import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: messages } = await supabase
    .from('ai_chat_messages')
    .select('id, role, content, created_at')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return NextResponse.json({ messages: messages ?? [] })
}
