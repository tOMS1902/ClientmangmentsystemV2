import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildClientContext } from '@/lib/ai/client-context'
import { chatSystemPrompt } from '@/lib/ai/chat-prompt'

const anthropic = new Anthropic()

const tools: Anthropic.Tool[] = [
  {
    name: 'modify_shopping_list',
    description: "Add or remove items from the client's custom shopping list. Use when the coach asks to add or remove specific foods from the shopping list.",
    input_schema: {
      type: 'object' as const,
      properties: {
        adds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['name'],
          },
        },
        removes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
    },
  },
]

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
    const messages: Anthropic.MessageParam[] = (history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: chatSystemPrompt(context),
      tools,
      messages,
    })

    // Process tool_use blocks
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (textBlock) reply = textBlock.text

    for (const block of toolUseBlocks) {
      if (block.name === 'modify_shopping_list') {
        const input = block.input as { adds?: { name: string; note?: string }[]; removes?: { name: string }[] }
        const rows: { client_id: string; name: string; note: string | null; action: 'add' | 'remove' }[] = []

        for (const item of (input.adds ?? [])) {
          rows.push({ client_id: clientId, name: item.name, note: item.note ?? null, action: 'add' })
        }
        for (const item of (input.removes ?? [])) {
          rows.push({ client_id: clientId, name: item.name, note: null, action: 'remove' })
        }

        if (rows.length > 0) {
          await supabase.from('custom_shopping_items').insert(rows)
        }
      }
    }

    // If stop_reason is tool_use and no text reply yet, get a follow-up text response
    if (response.stop_reason === 'tool_use' && !reply) {
      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(block => ({
        type: 'tool_result' as const,
        tool_use_id: block.id,
        content: 'Done',
      }))

      const followUp = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: chatSystemPrompt(context),
        tools,
        messages: [
          ...messages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ],
      })

      const followUpText = followUp.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      if (followUpText) reply = followUpText.text
    }
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
