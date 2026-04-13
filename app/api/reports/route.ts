import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DiagnosticReportCreateSchema, parseBody } from '@/lib/validation'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })

  const { data, error: fetchError } = await supabase
    .from('diagnostic_reports')
    .select('*')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .order('report_date', { ascending: false })

  if (fetchError) {
    console.error('[reports] fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(DiagnosticReportCreateSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: report, error: insertError } = await supabase
    .from('diagnostic_reports')
    .insert({ ...parsed.data, coach_id: user.id })
    .select()
    .single()

  if (insertError) {
    console.error('[reports] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }

  return NextResponse.json(report, { status: 201 })
}
