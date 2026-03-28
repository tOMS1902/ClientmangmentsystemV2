import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get the client's profile ID (user_id = profiles.id)
  const { data: client } = await supabase
    .from('clients').select('user_id').eq('id', clientId).single()

  if (!client?.user_id) return NextResponse.json(null)

  const { data: onboarding } = await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('client_id', client.user_id)
    .maybeSingle()

  return NextResponse.json(onboarding ?? null)
}
