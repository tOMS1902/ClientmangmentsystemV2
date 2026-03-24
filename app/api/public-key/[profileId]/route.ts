import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Users can always fetch their own public key.
  // For cross-user lookups, the requester must be a coach who owns that client.
  if (user.id !== profileId) {
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (requesterProfile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the coach owns the client whose key is being requested
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('id', profileId)
      .eq('coach_id', user.id)
      .maybeSingle()

    if (!clientRecord) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error: fetchError } = await supabase
    .from('profiles')
    .select('id, public_key')
    .eq('id', profileId)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: 'Failed to fetch public key' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ publicKey: data.public_key ?? null })
}
