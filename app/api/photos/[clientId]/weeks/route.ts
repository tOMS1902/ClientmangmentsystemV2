import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function resolvePhotoAccess(clientId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return { error: 'Unauthorized', status: 401, supabase: null, role: null, userId: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profile?.role) return { error: 'Unauthorized', status: 401, supabase: null, role: null, userId: null }

  if (profile.role === 'client') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', clientId)
      .single()
    if (!clientRecord) return { error: 'Forbidden', status: 403, supabase: null, role: null, userId: null }
  }

  if (profile.role === 'coach') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('coach_id', user.id)
      .single()
    if (!clientRecord) return { error: 'Forbidden', status: 403, supabase: null, role: null, userId: null }
  }

  return { error: null, status: 200, supabase, role: profile.role as 'coach' | 'client', userId: user.id }
}

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const access = await resolvePhotoAccess(clientId)
  if (access.error || !access.supabase) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { data, error: fetchError } = await access.supabase
    .from('check_in_photos')
    .select('week_number')
    .eq('client_id', clientId)
    .order('week_number', { ascending: false })

  if (fetchError) {
    console.error('[photos/weeks GET] DB error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch weeks' }, { status: 500 })
  }

  const weeks: number[] = Array.from(
    new Set((data || []).map((row) => row.week_number as number))
  )

  return NextResponse.json({ weeks })
}
