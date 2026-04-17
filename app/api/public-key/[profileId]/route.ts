import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error: fetchError } = await supabase
    .from('profiles')
    .select('id, public_key')
    .eq('id', profileId)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ publicKey: data.public_key ?? null })
}
