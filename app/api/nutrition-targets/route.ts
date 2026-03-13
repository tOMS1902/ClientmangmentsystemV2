import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { data: targets, error: upsertError } = await supabase
    .from('nutrition_targets')
    .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  return NextResponse.json(targets)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const { data: targets, error: fetchError } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (fetchError) return NextResponse.json(null)
  return NextResponse.json(targets)
}
