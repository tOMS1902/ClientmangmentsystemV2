import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DiagnosticReportPatchSchema, parseBody } from '@/lib/validation'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const { data: report, error: fetchError } = await supabase
    .from('diagnostic_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // Auth check
  if (profile?.role === 'coach') {
    if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (profile?.role === 'client') {
    if (report.status !== 'published') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // verify client owns this report
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('id', report.client_id)
      .eq('user_id', user.id)
      .single()
    if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch markers and insights in parallel
  const [markersResult, insightsResult] = await Promise.all([
    supabase.from('diagnostic_markers').select('*').eq('report_id', id).order('display_order'),
    supabase.from('diagnostic_insights').select('*').eq('report_id', id).order('display_order'),
  ])

  return NextResponse.json({
    ...report,
    markers: markersResult.data ?? [],
    insights: insightsResult.data ?? [],
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify ownership
  const { data: existing } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', id)
    .single()
  if (!existing) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (existing.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(DiagnosticReportPatchSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: updated, error: updateError } = await supabase
    .from('diagnostic_reports')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[reports] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
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

  const { data: existing } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', id)
    .single()
  if (!existing) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (existing.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: deleteError } = await supabase
    .from('diagnostic_reports')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[reports] delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
