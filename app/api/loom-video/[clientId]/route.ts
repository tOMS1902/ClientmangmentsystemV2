import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Allow coach or the client themselves
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'client') {
    // Verify this is their record
    const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase
    .from('weekly_loom_videos')
    .select('*')
    .eq('client_id', clientId)
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ video: data ?? null })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { loom_url, week_number } = await req.json()
  if (!loom_url || !week_number) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const LOOM_PATTERN = /^https:\/\/(www\.)?loom\.com\/(share|embed)\//
  if (!LOOM_PATTERN.test(loom_url)) {
    return NextResponse.json({ error: 'Invalid Loom URL — must be a loom.com share or embed link' }, { status: 400 })
  }

  // Upsert — replace video for same week if already exists
  const { data, error: upsertError } = await supabase
    .from('weekly_loom_videos')
    .upsert({ client_id: clientId, coach_id: user.id, loom_url, week_number }, { onConflict: 'client_id,week_number' })
    .select()
    .single()

  if (upsertError) {
    // If upsert fails due to no unique constraint, just insert
    const { data: inserted } = await supabase
      .from('weekly_loom_videos')
      .insert({ client_id: clientId, coach_id: user.id, loom_url, week_number })
      .select()
      .single()
    return NextResponse.json({ video: inserted })
  }

  return NextResponse.json({ video: data })
}
