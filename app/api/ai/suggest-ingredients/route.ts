import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mealName, description } = await req.json()
  if (!mealName || typeof mealName !== 'string') {
    return NextResponse.json({ error: 'mealName is required' }, { status: 400 })
  }

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `List the raw ingredients needed to make "${mealName}"${description ? ` (${description})` : ''} as a grocery shopping list.

Format: one ingredient per line, amount first then ingredient name.
Examples:
100g sliced chicken breast
1/4 avocado
2 tbsp olive oil
1 whole grain wrap (60g)
lettuce
cherry tomatoes

Rules:
- Include realistic per-serving amounts where measurable (grams preferred for proteins/carbs)
- Be specific with ingredient names (e.g. "sliced turkey breast" not just "turkey")
- Non-measurable items like "lettuce", "spinach", "salt" need no amount prefix
- Return ONLY the ingredient lines, no extra text, no numbering, no bullet points`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const ingredients = text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)

  return NextResponse.json({ ingredients })
}
