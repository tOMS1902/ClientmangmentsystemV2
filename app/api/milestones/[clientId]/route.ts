import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: milestones } = await supabase
    .from('client_milestones')
    .select('id, label, is_unlocked')
    .eq('client_id', clientId)
    .order('display_order', { ascending: true })

  return NextResponse.json({ milestones: milestones ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { label } = await req.json()
  if (!label?.trim()) return NextResponse.json({ error: 'Label is required' }, { status: 400 })

  const { data, error: insertError } = await supabase
    .from('client_milestones')
    .insert({ client_id: clientId, label: label.trim(), is_unlocked: false })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  return NextResponse.json({ milestone: data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, is_unlocked } = await req.json()
  if (!id) return NextResponse.json({ error: 'Milestone id is required' }, { status: 400 })

  const { data, error: updateError } = await supabase
    .from('client_milestones')
    .update({ is_unlocked })
    .eq('id', id)
    .eq('client_id', clientId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  return NextResponse.json({ milestone: data })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  await supabase.from('client_milestones').delete().eq('id', id).eq('client_id', clientId)
  return NextResponse.json({ ok: true })
}
