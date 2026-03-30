import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { clientId } = await request.json()

  const { data: onboarding } = await supabase
    .from('onboarding_responses')
    .select('responses')
    .eq('client_id', clientId)
    .single()

  if (!onboarding) return NextResponse.json({ error: 'No onboarding data found' }, { status: 404 })

  const r = onboarding.responses as Record<string, string>

  let message
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Based on this client's onboarding information, generate an appropriate training programme.

Client details:
- Primary goals: ${r.primary_goals}
- Training days per week: ${r.training_days}
- Experience level: ${r.training_experience}
- Preferred style: ${r.preferred_style}
- Preferred structure: ${r.workout_structure}
- Preferred time: ${r.preferred_time}
- Injuries/limitations: ${r.injuries}
- Equipment/exercises to avoid: ${r.avoid_exercises}
- Priority areas: ${r.priority_areas}
- Strength goals: ${r.strength_goals}
- Mobility/prehab: ${r.mobility_prehab}
- Current weight: ${r.weight_kg}kg

Return a JSON training programme with this structure:
{ "name": string, "days": [{ "day_label": string, "exercises": [{ "name": string, "sets": number, "reps": string, "rest_seconds": number | null, "notes": string | null }] }] }

Return only valid JSON.`
      }]
    })
  } catch {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content.text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response as JSON' }, { status: 500 })
  }
}
