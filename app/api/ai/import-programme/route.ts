import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { text } = await request.json()

  // Strip markdown code fences if the AI wrapped the JSON in ```json ... ```
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)

    if (!parsed.name || !Array.isArray(parsed.days)) {
      return NextResponse.json(
        { error: 'Invalid format. Expected { name, days: [...] }' },
        { status: 400 }
      )
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json(
      { error: 'Could not parse the response as JSON. Make sure you copied the full AI response.' },
      { status: 400 }
    )
  }
}
