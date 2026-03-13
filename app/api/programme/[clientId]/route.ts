import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'client') {
    const { data: clientRecord } = await supabase
      .from('clients').select('id').eq('user_id', user.id).single()
    if (clientRecord?.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: programme, error: fetchError } = await supabase
    .from('programmes')
    .select(`*, days:programme_days(*, exercises(* order by sort_order))`)
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fetchError) return NextResponse.json(null)
  return NextResponse.json(programme)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  // When called as PATCH /api/programme/[programmeId], the param is the programme ID
  const { clientId: programmeId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, days } = await request.json()

  // Update programme name
  if (name) {
    await supabase.from('programmes').update({ name }).eq('id', programmeId)
  }

  // If days provided, replace all days and exercises
  if (days) {
    // Delete existing days (cascades to exercises)
    await supabase.from('programme_days').delete().eq('programme_id', programmeId)

    // Recreate days and exercises
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const { data: progDay } = await supabase
        .from('programme_days')
        .insert({
          programme_id: programmeId,
          day_number: i + 1,
          day_label: day.day_label,
          sort_order: i + 1,
        })
        .select()
        .single()

      if (progDay && day.exercises?.length) {
        await supabase.from('exercises').insert(
          day.exercises.map((ex: { name: string; sets: number; reps: string; rest_seconds: number | null; notes: string | null }, j: number) => ({
            day_id: progDay.id,
            ...ex,
            sort_order: j + 1,
          }))
        )
      }
    }
  }

  const { data: updated } = await supabase
    .from('programmes')
    .select(`*, days:programme_days(*, exercises(*))`)
    .eq('id', programmeId)
    .single()

  return NextResponse.json(updated)
}
