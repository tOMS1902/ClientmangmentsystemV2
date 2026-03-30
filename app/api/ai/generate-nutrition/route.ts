import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AINutritionSchema, parseBody } from '@/lib/validation'

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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Generate nutrition targets for a fitness coaching client.

Client details:
- Primary goals: ${r.primary_goals}
- Age: ${r.age}, Height: ${r.height}, Weight: ${r.weight_kg}kg
- Daily steps: ${r.daily_steps}
- Training days per week: ${r.training_days}
- Meals per day: ${r.meals_per_day}
- Food allergies/intolerances: ${r.food_allergies}
- Foods to avoid: ${r.foods_avoided}
- Calorie tracking experience: ${r.calorie_tracking}
- Medical conditions: ${r.medical_conditions}

Return JSON with these fields:
{
  "td_calories": number,
  "td_protein": number,
  "td_carbs": number,
  "td_fat": number,
  "ntd_calories": number,
  "ntd_protein": number,
  "ntd_carbs": number,
  "ntd_fat": number,
  "daily_steps": number,
  "sleep_target_hours": number
}

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
    const raw = JSON.parse(content.text)
    const validated = parseBody(AINutritionSchema, raw)
    if (!validated.success) {
      return NextResponse.json({ error: 'AI returned invalid data' }, { status: 500 })
    }
    return NextResponse.json(validated.data)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response as JSON' }, { status: 500 })
  }
}
