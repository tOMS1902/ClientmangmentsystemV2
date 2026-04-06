import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_BADGE_KEYS = ['first_month', 'first_5kg', 'first_race', 'vo2_improved', 'bloodwork_optimised']

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: badges } = await supabase
    .from('client_badges')
    .select('*')
    .eq('client_id', clientId)
    .order('awarded_at', { ascending: true })

  return NextResponse.json({ badges: badges ?? [] })
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

  const { badge_key } = await req.json()
  if (!VALID_BADGE_KEYS.includes(badge_key)) return NextResponse.json({ error: 'Invalid badge key' }, { status: 400 })

  const { data, error: insertError } = await supabase
    .from('client_badges')
    .upsert({ client_id: clientId, badge_key, awarded_by: 'coach' }, { onConflict: 'client_id,badge_key' })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: 'Failed to award badge' }, { status: 500 })
  return NextResponse.json({ badge: data })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { badge_key } = await req.json()
  await supabase.from('client_badges').delete().eq('client_id', clientId).eq('badge_key', badge_key)
  return NextResponse.json({ ok: true })
}
