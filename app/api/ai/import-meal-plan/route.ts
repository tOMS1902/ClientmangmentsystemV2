import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await request.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  // Strip markdown fences if present
  const cleaned = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON. Make sure you paste only the AI response without extra text.' },
      { status: 400 }
    )
  }

  if (typeof parsed !== 'object' || !parsed) {
    return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 })
  }

  const data = parsed as Record<string, unknown>

  if (!data.training_day || !data.rest_day) {
    return NextResponse.json(
      { error: 'JSON must have both training_day and rest_day fields.' },
      { status: 400 }
    )
  }

  const td = data.training_day as { meals?: unknown }
  const rd = data.rest_day as { meals?: unknown }

  if (!Array.isArray(td.meals) || !Array.isArray(rd.meals)) {
    return NextResponse.json(
      { error: 'training_day.meals and rest_day.meals must be arrays.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ training_day: td, rest_day: rd })
}
