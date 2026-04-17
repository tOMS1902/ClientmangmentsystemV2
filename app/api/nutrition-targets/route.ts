import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NutritionTargetsSchema, parseBody } from '@/lib/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(NutritionTargetsSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Verify coach owns this client
  const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', parsed.data.client_id).eq('coach_id', user.id).single()
  if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: targets, error: upsertError } = await supabase
    .from('nutrition_targets')
    .upsert({ ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(targets)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  // Verify caller owns or manages this client
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role === 'coach') {
    const { data: owned } = await supabase.from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
    if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (callerProfile?.role === 'client') {
    const { data: owned } = await supabase.from('clients').select('id').eq('user_id', user.id).single()
    if (!owned || owned.id !== clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: targets, error: fetchError } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (fetchError) return NextResponse.json(null)
  return NextResponse.json(targets)
}
