import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profile?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (profile.role === 'client') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (clientRecord?.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (profile.role === 'coach') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('coach_id', user.id)
      .single()
    if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark inbound messages (from the other party) as read
  const inboundRole = profile?.role === 'coach' ? 'client' : 'coach'

  const { error: updateError } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('client_id', clientId)
    .eq('sender_role', inboundRole)
    .eq('is_read', false)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
