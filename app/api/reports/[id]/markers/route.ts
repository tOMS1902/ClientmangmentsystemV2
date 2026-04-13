import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  const { data: markers } = await supabase
    .from('diagnostic_markers')
    .select('*')
    .eq('report_id', id)
    .order('display_order')

  return NextResponse.json(markers ?? [])
}
