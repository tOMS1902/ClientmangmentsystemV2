import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/onboarding/legal/[clientId]
// clientId = clients.id (not profiles.id)
// Resolves clients.id → clients.user_id → legal_onboarding_submissions.client_id
export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: client } = await supabase.from('clients').select('user_id').eq('id', clientId).eq('coach_id', user.id).single()
  if (!client?.user_id) return NextResponse.json(null)

  const { data: submission } = await supabase
    .from('legal_onboarding_submissions')
    .select('*')
    .eq('client_id', client.user_id)
    .maybeSingle()

  return NextResponse.json(submission ?? null)
}
