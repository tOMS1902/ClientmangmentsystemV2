import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string; planId: string }> }
) {
  const { planId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: changes, error: fetchError } = await supabase
    .from('weekly_plan_changes')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(changes ?? [])
}
