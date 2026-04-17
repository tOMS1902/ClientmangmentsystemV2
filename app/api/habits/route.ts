import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { HabitSchema, parseBody } from '@/lib/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(HabitSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Verify coach owns this client
  const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', parsed.data.client_id).eq('coach_id', user.id).single()
  if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: habit, error: insertError } = await supabase
    .from('habits')
    .insert(parsed.data)
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json(habit, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const habitId = searchParams.get('id')

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!habitId) return NextResponse.json({ error: 'habit id required' }, { status: 400 })

  const { error: updateError } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId)

  if (updateError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json({ success: true })
}
