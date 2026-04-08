import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type ActivityItem = {
  id: string
  type: 'weekly_checkin' | 'midweek_check' | 'message'
  client_name: string
  client_id: string
  week_number: number | null
  created_at: string
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: weeklyRows }, { data: midweekRows }, { data: messageRows }] = await Promise.all([
    supabase
      .from('weekly_checkins')
      .select('id, week_number, created_at, client_id, clients!inner(full_name, coach_id)')
      .eq('clients.coach_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('midweek_checks')
      .select('id, week_number, submitted_at, client_id, clients!inner(full_name, coach_id)')
      .eq('clients.coach_id', user.id)
      .gte('submitted_at', since)
      .order('submitted_at', { ascending: false })
      .limit(30),

    supabase
      .from('messages')
      .select('id, created_at, client_id, clients!inner(full_name, coach_id)')
      .eq('clients.coach_id', user.id)
      .eq('sender_role', 'client')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const items: ActivityItem[] = []

  for (const row of weeklyRows ?? []) {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
    if (!client) continue
    items.push({
      id: row.id,
      type: 'weekly_checkin',
      client_name: client.full_name,
      client_id: row.client_id,
      week_number: row.week_number,
      created_at: row.created_at,
    })
  }

  for (const row of midweekRows ?? []) {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
    if (!client) continue
    items.push({
      id: row.id,
      type: 'midweek_check',
      client_name: client.full_name,
      client_id: row.client_id,
      week_number: row.week_number,
      created_at: row.submitted_at,
    })
  }

  for (const row of messageRows ?? []) {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
    if (!client) continue
    items.push({
      id: row.id,
      type: 'message',
      client_name: client.full_name,
      client_id: row.client_id,
      week_number: null,
      created_at: row.created_at,
    })
  }

  // Sort by created_at descending, take top 30
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const result = items.slice(0, 30)

  return NextResponse.json(result)
}
