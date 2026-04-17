import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { responses } = await request.json()

  const { data: existing } = await supabase
    .from('onboarding_responses')
    .select('id')
    .eq('client_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Onboarding already completed' }, { status: 409 })
  }

  const { data: onboarding, error: insertError } = await supabase
    .from('onboarding_responses')
    .insert({ client_id: user.id, responses })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  // Mark profile onboarding complete
  await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id)

  return NextResponse.json(onboarding, { status: 201 })
}
