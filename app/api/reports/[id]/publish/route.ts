import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data, error: updateError } = await supabase
    .from('diagnostic_reports')
    .update({ status: 'published' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[reports] publish error:', updateError)
    return NextResponse.json({ error: 'Failed to publish report' }, { status: 500 })
  }

  return NextResponse.json(data)
}
