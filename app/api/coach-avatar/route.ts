import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { avatar_url } = await request.json()

  if (avatar_url !== null && avatar_url !== undefined) {
    if (typeof avatar_url !== 'string') {
      return NextResponse.json({ error: 'Invalid avatar_url' }, { status: 400 })
    }
    if (!avatar_url.startsWith('https://')) {
      return NextResponse.json({ error: 'avatar_url must be an HTTPS URL' }, { status: 400 })
    }
  }

  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url })
    .eq('id', user.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ profile: data })
}
