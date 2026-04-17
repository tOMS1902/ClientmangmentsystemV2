import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function resolveAccess(clientId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return { error: 'Unauthorized', status: 401, supabase: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profile?.role) return { error: 'Unauthorized', status: 401, supabase: null }

  if (profile.role === 'client') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (clientRecord?.id !== clientId) {
      return { error: 'Forbidden', status: 403, supabase: null }
    }
  }

  if (profile.role === 'coach') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('coach_id', user.id)
      .single()
    if (!clientRecord) return { error: 'Forbidden', status: 403, supabase: null }
  }

  return { error: null, status: 200, supabase, role: profile.role as 'coach' | 'client' }
}

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const access = await resolveAccess(clientId)
  if (access.error || !access.supabase) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { searchParams } = new URL(request.url)
  const before = searchParams.get('before')
  const limit = 50

  let query = access.supabase
    .from('messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data: messages, error: fetchError } = await query
  if (fetchError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  return NextResponse.json({
    messages: (messages || []).reverse(),
    hasMore: (messages || []).length === limit,
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const access = await resolveAccess(clientId)
  if (access.error || !access.supabase) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { body, iv, voice_url } = await request.json()
  const isVoice = typeof voice_url === 'string' && voice_url.length > 0
  if (!isVoice && (!body || typeof body !== 'string' || body.trim().length === 0)) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
  }
  if (typeof body === 'string' && body.length > 8000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  const { data: message, error: insertError } = await access.supabase
    .from('messages')
    .insert({
      client_id: clientId,
      sender_role: access.role,
      body: isVoice ? '' : body.trim(),
      iv: iv || null,
      voice_url: voice_url || null,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(message, { status: 201 })
}
