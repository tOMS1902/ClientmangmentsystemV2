import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  url: z.string().min(1).max(500).trim(),
})

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error: fetchError } = await supabase
    .from('exercise_videos')
    .select('*')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { data, error: insertError } = await supabase
    .from('exercise_videos')
    .insert({ coach_id: user.id, title: parsed.data.title, url: parsed.data.url })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
