import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ClientPatchSchema, parseBody } from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profile?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase.from('clients').select('*').eq('id', id)
  if (profile.role === 'client') {
    query = query.eq('user_id', user.id)
  } else if (profile.role === 'coach') {
    query = query.eq('coach_id', user.id)
  }

  const { data: client, error: fetchError } = await query.single()
  if (fetchError) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(ClientPatchSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: client, error: updateError } = await supabase
    .from('clients')
    .update(parsed.data)
    .eq('id', id)
    .eq('coach_id', user.id)  // ensures coach can only update their own clients
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json(client)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('coach_id', user.id)

  if (deleteError) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
