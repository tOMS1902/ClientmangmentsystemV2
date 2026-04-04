import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const globalSystemPrompt = (context: string) => `You are an expert fitness coaching assistant with full visibility of the coach's entire client roster.

${context}

Your role:
- Answer questions about any client or the roster as a whole
- Flag clients who may need urgent attention (missed check-ins, declining scores, low energy trends)
- Summarise trends across the group when asked
- Be concise and direct — bullet points preferred for lists
- When mentioning a client, always use their first name
- If asked about a specific client in detail, give a focused answer from the data above`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message, history } = await request.json() as { message: string; history: Message[] }
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  // Fetch all active clients with their latest check-in
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, goal_weight, start_weight, start_date, check_in_day')
    .eq('coach_id', user.id)
    .eq('is_active', true)
    .order('full_name')

  if (!clients?.length) {
    return NextResponse.json({ reply: 'You have no active clients yet.' })
  }

  const clientIds = clients.map(c => c.id)

  // Fetch latest check-in per client and recent midweek checks
  const [{ data: checkins }, { data: midweekChecks }] = await Promise.all([
    supabase
      .from('weekly_checkins')
      .select('client_id, week_number, check_in_date, weight, week_score, energy_score, diet_rating, training_completed, biggest_win, main_challenge')
      .in('client_id', clientIds)
      .order('check_in_date', { ascending: false }),
    supabase
      .from('midweek_checks')
      .select('client_id, week_number, training_on_track, food_on_track, energy_level, submitted_at')
      .in('client_id', clientIds)
      .order('submitted_at', { ascending: false }),
  ])

  // Group latest check-in per client
  const latestCheckin = new Map<string, typeof checkins extends (infer T)[] | null ? T : never>()
  for (const c of (checkins ?? [])) {
    if (!latestCheckin.has(c.client_id)) latestCheckin.set(c.client_id, c)
  }

  // Group all check-ins per client for trend
  const allCheckins = new Map<string, typeof checkins>()
  for (const c of (checkins ?? [])) {
    if (!allCheckins.has(c.client_id)) allCheckins.set(c.client_id, [])
    allCheckins.get(c.client_id)!.push(c)
  }

  // Latest midweek per client
  const latestMidweek = new Map<string, typeof midweekChecks extends (infer T)[] | null ? T : never>()
  for (const m of (midweekChecks ?? [])) {
    if (!latestMidweek.has(m.client_id)) latestMidweek.set(m.client_id, m)
  }

  const today = new Date()

  // Build context string
  const lines: string[] = [
    `COACH'S ACTIVE ROSTER — ${clients.length} clients`,
    `Today: ${today.toDateString()}`,
    '',
  ]

  for (const client of clients) {
    const latest = latestCheckin.get(client.id)
    const midweek = latestMidweek.get(client.id)
    const clientCheckins = allCheckins.get(client.id) ?? []
    const weekNumber = Math.max(1, Math.ceil((today.getTime() - new Date(client.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)))

    // Days since last check-in
    const daysSinceCheckin = latest
      ? Math.floor((today.getTime() - new Date(latest.check_in_date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Energy trend (last 3 check-ins)
    const recentEnergy = clientCheckins.slice(0, 3).map(c => c.energy_score).filter(e => e != null) as number[]
    const energyTrend = recentEnergy.length >= 2
      ? (recentEnergy[0] < recentEnergy[recentEnergy.length - 1] ? 'declining' : recentEnergy[0] > recentEnergy[recentEnergy.length - 1] ? 'improving' : 'stable')
      : 'unknown'

    // Weight progress
    const weightChange = clientCheckins.length >= 2
      ? (clientCheckins[0].weight - clientCheckins[clientCheckins.length - 1].weight).toFixed(1)
      : null

    lines.push(`CLIENT: ${client.full_name} (Week ${weekNumber})`)
    lines.push(`  Weight: ${latest?.weight ?? '?'}kg → Goal: ${client.goal_weight}kg${weightChange ? ` | Change since start: ${Number(weightChange) >= 0 ? '+' : ''}${weightChange}kg` : ''}`)

    if (latest) {
      lines.push(`  Last check-in: Week ${latest.week_number} (${daysSinceCheckin} days ago) | Score: ${latest.week_score ?? '?'}/10 | Energy: ${latest.energy_score ?? '?'} | Diet: ${latest.diet_rating ?? '?'} | Training: ${latest.training_completed ?? '?'}`)
      if (latest.biggest_win) lines.push(`  Win: "${latest.biggest_win}"`)
      if (latest.main_challenge) lines.push(`  Challenge: "${latest.main_challenge}"`)
    } else {
      lines.push(`  No check-ins submitted yet`)
    }

    if (midweek) {
      lines.push(`  Latest midweek: training ${midweek.training_on_track}, food ${midweek.food_on_track}, energy ${midweek.energy_level}/5`)
    }

    if (recentEnergy.length >= 2) {
      lines.push(`  Energy trend: ${energyTrend} (${recentEnergy.join(', ')})`)
    }

    // Flag if overdue for check-in
    if (daysSinceCheckin !== null && daysSinceCheckin > 10) {
      lines.push(`  ⚠ OVERDUE: No check-in for ${daysSinceCheckin} days`)
    } else if (latest === undefined) {
      lines.push(`  ⚠ No check-ins on record`)
    }

    lines.push('')
  }

  const context = lines.join('\n')

  // Build messages including history
  const messages: Message[] = [
    ...(history ?? []).slice(-10),
    { role: 'user', content: message },
  ]

  let reply = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: globalSystemPrompt(context),
      messages,
    })
    const content = response.content[0]
    if (content.type === 'text') reply = content.text
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[coach-global-chat] AI error:', msg)
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 503 })
  }

  return NextResponse.json({ reply })
}
