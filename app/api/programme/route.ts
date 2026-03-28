import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ProgrammeSchema, parseBody } from '@/lib/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(ProgrammeSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { clientId, name, days } = parsed.data

  // Verify coach owns this client
  const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
  if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Deactivate existing programmes
  await supabase.from('programmes').update({ is_active: false }).eq('client_id', clientId)

  // Create new programme
  const { data: programme, error: progError } = await supabase
    .from('programmes')
    .insert({ client_id: clientId, name, is_active: true })
    .select()
    .single()

  if (progError) return NextResponse.json({ error: progError.message }, { status: 500 })

  // Create days and exercises
  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    const { data: progDay, error: dayError } = await supabase
      .from('programme_days')
      .insert({
        programme_id: programme.id,
        day_number: i + 1,
        day_label: day.day_label,
        sort_order: i + 1,
      })
      .select()
      .single()

    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 })

    if (day.exercises?.length) {
      const { error: exerciseError } = await supabase.from('exercises').insert(
        day.exercises.map((ex: { name: string; sets: number; reps: string; rest_seconds?: number | null; video_url?: string | null; notes?: string | null }, j: number) => ({
          day_id: progDay.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
          sort_order: j + 1,
        }))
      )
      if (exerciseError) return NextResponse.json({ error: exerciseError.message }, { status: 500 })
    }
  }

  return NextResponse.json(programme, { status: 201 })
}
