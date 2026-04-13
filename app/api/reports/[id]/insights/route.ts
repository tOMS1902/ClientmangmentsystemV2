import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CATEGORY_ORDER: Record<string, number> = {
  'priority-focus': 0,
  'key-risks': 1,
  'nutrition': 2,
  'training': 3,
  'recovery': 4,
  'general': 5,
}

const VALID_CATEGORIES = ['priority-focus', 'key-risks', 'nutrition', 'training', 'recovery', 'general']
const VALID_PRIORITIES = ['high', 'medium', 'low']

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id, client_id, status')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  if (profile?.role === 'coach' && report.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (profile?.role === 'client') {
    if (report.status !== 'published') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: cr } = await supabase
      .from('clients')
      .select('id')
      .eq('id', report.client_id)
      .eq('user_id', user.id)
      .single()
    if (!cr) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: insights } = await supabase
    .from('diagnostic_insights')
    .select('*')
    .eq('report_id', id)

  const sorted = (insights ?? []).sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 99
    const catB = CATEGORY_ORDER[b.category] ?? 99
    if (catA !== catB) return catA - catB
    return (a.display_order ?? 0) - (b.display_order ?? 0)
  })

  return NextResponse.json(sorted)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  if (!Array.isArray(body?.insights) || body.insights.length === 0) {
    return NextResponse.json({ error: 'insights array is required' }, { status: 400 })
  }

  const toInsert = body.insights.map((item: any, i: number) => ({
    report_id: id,
    title: String(item.title || '').slice(0, 80),
    description: String(item.description || ''),
    category: VALID_CATEGORIES.includes(item.category) ? item.category : 'general',
    priority: VALID_PRIORITIES.includes(item.priority) ? item.priority : 'medium',
    coach_note: String(item.coach_note || ''),
    recommendation: String(item.recommendation || ''),
    display_order: item.display_order ?? i,
  })).filter((item: any) => item.title.length > 0)

  if (toInsert.length === 0) {
    return NextResponse.json({ error: 'No valid insights to insert' }, { status: 400 })
  }

  const { data: created, error: insertError } = await supabase
    .from('diagnostic_insights')
    .insert(toInsert)
    .select()

  if (insertError) {
    console.error('[insights/bulk] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save insights' }, { status: 500 })
  }

  return NextResponse.json(created, { status: 201 })
}
