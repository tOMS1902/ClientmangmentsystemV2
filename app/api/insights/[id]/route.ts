import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the insight and its parent report to verify ownership
  const { data: insight } = await supabase
    .from('diagnostic_insights')
    .select('id, report_id')
    .eq('id', id)
    .single()

  if (!insight) return NextResponse.json({ error: 'Insight not found' }, { status: 404 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', insight.report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  // Whitelist updatable fields
  const allowed = [
    'title',
    'description',
    'category',
    'priority',
    'coach_note',
    'recommendation',
    'display_order',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Clamp title length if provided
  if (typeof updates.title === 'string') {
    updates.title = updates.title.slice(0, 80)
  }

  const { data: updated, error: updateError } = await supabase
    .from('diagnostic_insights')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[insights/patch] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the insight and its parent report to verify ownership
  const { data: insight } = await supabase
    .from('diagnostic_insights')
    .select('id, report_id')
    .eq('id', id)
    .single()

  if (!insight) return NextResponse.json({ error: 'Insight not found' }, { status: 404 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', insight.report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: deleteError } = await supabase
    .from('diagnostic_insights')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[insights/delete] delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
