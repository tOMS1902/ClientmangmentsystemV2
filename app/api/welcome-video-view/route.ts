import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, welcome_video_views')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newCount = (clientRecord.welcome_video_views ?? 0) + 1
  await supabase.from('clients').update({ welcome_video_views: newCount }).eq('id', clientRecord.id)

  return NextResponse.json({ views: newCount })
}
