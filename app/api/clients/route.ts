import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user.id)
    .eq('is_active', true)
    .order('full_name')

  if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 500 })
  return NextResponse.json(clients)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { password, ...clientFields } = body

  // Create the auth user — the DB trigger auto-creates their profile
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: clientFields.email,
    password,
    user_metadata: { full_name: clientFields.full_name, role: 'client' },
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Insert the client record with user_id already linked
  const { data: client, error: insertError } = await supabase
    .from('clients')
    .insert({ ...clientFields, coach_id: user.id, user_id: authData.user.id })
    .select()
    .single()

  if (insertError) {
    // Roll back the auth user if client insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(client, { status: 201 })
}
