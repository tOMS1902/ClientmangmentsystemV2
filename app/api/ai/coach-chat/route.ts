import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildClientContext } from '@/lib/ai/client-context'
import { chatSystemPrompt } from '@/lib/ai/chat-prompt'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { clientId, message } = await request.json()
  if (!clientId || !message) return NextResponse.json({ error: 'Missing clientId or message' }, { status: 400 })

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, coach_id')
    .eq('id', clientId)
    .single()

  if (!clientRecord || clientRecord.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.from('ai_chat_messages').insert({
    client_id: clientId,
    coach_id: user.id,
    role: 'user',
    content: message,
  })

  const { data: history } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const context = await buildClientContext(clientId, supabase)

  let reply = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: chatSystemPrompt(context),
      messages: (history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })
    const content = response.content[0]
    if (content.type === 'text') reply = content.text
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[coach-chat] AI error:', msg)
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 503 })
  }

  await supabase.from('ai_chat_messages').insert({
    client_id: clientId,
    coach_id: user.id,
    role: 'assistant',
    content: reply,
  })

  return NextResponse.json({ reply })
}
