import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { publicKey } = await request.json()
  if (!publicKey || typeof publicKey !== 'string') {
    return NextResponse.json({ error: 'Invalid public key' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ public_key: publicKey })
    .eq('id', user.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
