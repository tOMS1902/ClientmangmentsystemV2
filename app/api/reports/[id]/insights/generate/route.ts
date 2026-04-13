import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_CATEGORIES = ['priority-focus', 'key-risks', 'nutrition', 'training', 'recovery', 'general']
const VALID_PRIORITIES = ['high', 'medium', 'low']

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (report.report_type !== 'genetics') {
    return NextResponse.json({ error: 'Only genetics reports support insight generation' }, { status: 400 })
  }

  const body = await request.json()
  const text = body?.text as string

  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: 'Please paste the genetics report text to generate insights' },
      { status: 400 },
    )
  }

  const { replace } = body
  if (replace) {
    await supabase.from('diagnostic_insights').delete().eq('report_id', id)
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `You are a health performance analyst summarising a genetics report for a performance coach.
Extract only the most actionable insights. Write in plain English for a non-scientist.
DO NOT include: gene codes, SNP IDs (rs numbers), technical scores, or scientific jargon.
DO NOT make medical diagnoses or clinical recommendations.
Return ONLY a valid JSON array. No preamble, no explanation, no markdown, no backticks.
Each item must have: title (string, max 80 chars), description (string, 2-4 sentences),
category (one of: priority-focus, key-risks, nutrition, training, recovery, general),
priority (one of: high, medium, low).`,
      messages: [
        {
          role: 'user',
          content: `Analyse this genetics report and extract actionable insights:\n\n${text.slice(0, 15000)}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: any[]
    try {
      parsed = JSON.parse(responseText)
      if (!Array.isArray(parsed)) throw new Error('Not an array')
    } catch {
      return NextResponse.json(
        { error: 'Insight generation failed — AI returned invalid format. Please try again or enter insights manually.' },
        { status: 500 },
      )
    }

    const toInsert = parsed
      .map((item: any, i: number) => ({
        report_id: id,
        title: String(item.title || '').slice(0, 80),
        description: String(item.description || ''),
        category: VALID_CATEGORIES.includes(item.category) ? item.category : 'general',
        priority: VALID_PRIORITIES.includes(item.priority) ? item.priority : 'medium',
        coach_note: '',
        recommendation: '',
        display_order: i,
      }))
      .filter((item: any) => item.title.length > 0)

    const { data: created, error: insertError } = await supabase
      .from('diagnostic_insights')
      .insert(toInsert)
      .select()

    if (insertError) {
      console.error('[insights/generate] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save insights' }, { status: 500 })
    }

    return NextResponse.json({ count: created!.length, insights: created }, { status: 201 })
  } catch (e) {
    console.error('[insights/generate] AI error:', e)
    return NextResponse.json(
      { error: 'Insight generation failed. Please try again or enter insights manually.' },
      { status: 500 },
    )
  }
}
