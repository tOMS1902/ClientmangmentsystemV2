import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the marker and its parent report to verify ownership
  const { data: marker } = await supabase
    .from('diagnostic_markers')
    .select('id, report_id')
    .eq('id', id)
    .single()

  if (!marker) return NextResponse.json({ error: 'Marker not found' }, { status: 404 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', marker.report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  // Whitelist updatable fields
  const allowed = [
    'marker_name',
    'value',
    'unit',
    'reference_range_low',
    'reference_range_high',
    'status',
    'category',
    'short_explanation',
    'coach_note',
    'recommendation',
    'is_flagged',
    'display_order',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('diagnostic_markers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[markers/patch] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update marker' }, { status: 500 })
  }

  // Recalculate health score for the parent report
  const { data: allMarkers } = await supabase
    .from('diagnostic_markers')
    .select('status')
    .eq('report_id', marker.report_id)

  const total = allMarkers?.length ?? 0
  const optimal = allMarkers?.filter((m) => m.status === 'optimal').length ?? 0
  const healthScore = total > 0 ? Math.round((optimal / total) * 100) : 0

  await supabase
    .from('diagnostic_reports')
    .update({ health_score: healthScore })
    .eq('id', marker.report_id)

  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the marker and its parent report to verify ownership
  const { data: marker } = await supabase
    .from('diagnostic_markers')
    .select('id, report_id')
    .eq('id', id)
    .single()

  if (!marker) return NextResponse.json({ error: 'Marker not found' }, { status: 404 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', marker.report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: deleteError } = await supabase
    .from('diagnostic_markers')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[markers/delete] delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete marker' }, { status: 500 })
  }

  // Recalculate health score for the parent report after deletion
  const { data: remainingMarkers } = await supabase
    .from('diagnostic_markers')
    .select('status')
    .eq('report_id', marker.report_id)

  const total = remainingMarkers?.length ?? 0
  const optimal = remainingMarkers?.filter((m) => m.status === 'optimal').length ?? 0
  const healthScore = total > 0 ? Math.round((optimal / total) * 100) : 0

  await supabase
    .from('diagnostic_reports')
    .update({ health_score: healthScore })
    .eq('id', marker.report_id)

  return NextResponse.json({ success: true })
}
