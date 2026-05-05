import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getClientId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = await getClientId(supabase, user.id)
  if (!clientId) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const { data: notifications } = await supabase
    .from('client_notifications')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(10)

  const unreadCount = (notifications ?? []).filter((n: { is_read: boolean }) => !n.is_read).length

  return NextResponse.json({ unread_count: unreadCount, notifications: notifications ?? [] })
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = await getClientId(supabase, user.id)
  if (!clientId) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

  const body = await req.json()
  const ids: string[] = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  await supabase
    .from('client_notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('client_id', clientId)

  return NextResponse.json({ ok: true })
}
