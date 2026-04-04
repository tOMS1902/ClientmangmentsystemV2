import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getResend } from '@/lib/email/resend'
import { buildCheckinReportHtml } from '@/lib/email/templates/checkin-report'
import { reportSystemPrompt } from '@/lib/ai/report-prompt'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const internalKey = request.headers.get('x-internal-key')
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { checkinId, clientId } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [
      { data: checkin },
      { data: client },
      { data: recentCheckins },
      { data: targets },
    ] = await Promise.all([
      supabase.from('weekly_checkins').select('*').eq('id', checkinId).single(),
      supabase.from('clients').select('id, full_name, email, coach_id, start_date, goal_weight').eq('id', clientId).single(),
      supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('check_in_date', { ascending: false }).limit(6),
      supabase.from('nutrition_targets').select('*').eq('client_id', clientId).maybeSingle(),
    ])

    if (!checkin || !client) {
      console.error('[checkin-report] Missing data', { checkinId, clientId })
      return NextResponse.json({ ok: false })
    }

    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', client.coach_id)
      .single()

    if (!coachProfile?.email) {
      console.error('[checkin-report] No coach email found for coach_id:', client.coach_id)
      return NextResponse.json({ ok: false })
    }

    const prevCheckin = recentCheckins?.[1] ?? null
    const weightChange = prevCheckin
      ? (checkin.weight - prevCheckin.weight).toFixed(1)
      : null

    const context = `
Client: ${client.full_name}
Week: ${checkin.week_number}
Current weight: ${checkin.weight}kg (goal: ${client.goal_weight}kg)
Weight change from last week: ${weightChange !== null ? `${Number(weightChange) >= 0 ? '+' : ''}${weightChange}kg` : 'N/A (first check-in)'}

This week's scores:
- Week score: ${checkin.week_score ?? 'N/A'}/10
- Energy: ${checkin.energy_score ?? checkin.energy_summary ?? 'N/A'}
- Sleep: ${checkin.sleep_score ?? checkin.sleep_summary ?? 'N/A'}
- Hunger: ${checkin.hunger_score ?? 'N/A'}
- Cravings: ${checkin.cravings_score ?? 'N/A'}
- Diet: ${checkin.diet_rating ?? checkin.diet_summary ?? 'N/A'}
- Training: ${checkin.training_completed ?? checkin.training_sessions ?? 'N/A'}
- Avg steps: ${checkin.avg_steps ?? 'N/A'}

Client's words:
- Biggest win: ${checkin.biggest_win ?? 'N/A'}
- Main challenge: ${checkin.main_challenge ?? 'N/A'}
- How to improve next week: ${checkin.improve_next_week ?? checkin.focus_next_week ?? 'N/A'}
- Support needed: ${checkin.coach_support ?? 'N/A'}
- Anything else: ${checkin.anything_else ?? 'N/A'}

${targets ? `Nutrition targets: ${targets.td_calories}kcal / ${targets.td_protein}g protein (training day)` : ''}

Recent weight trend (last ${recentCheckins?.length ?? 0} check-ins, newest first): ${recentCheckins?.map((c: { weight: number }) => `${c.weight}kg`).join(', ') ?? 'N/A'}
Energy scores (recent): ${recentCheckins?.map((c: { energy_score: number | null }) => c.energy_score ?? '?').join(', ') ?? 'N/A'}
`.trim()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: reportSystemPrompt,
      messages: [{ role: 'user', content: context }],
    })

    const textContent = message.content[0]
    if (textContent.type !== 'text') throw new Error('Unexpected AI response type')

    const reportData = JSON.parse(textContent.text)

    const clientPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/clients/${clientId}`
    const html = buildCheckinReportHtml(reportData, clientPageUrl)

    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'RuFlo Coaching <onboarding@resend.dev>',
      to: coachProfile.email,
      subject: reportData.headline,
      html,
    })

    console.log('[checkin-report] Report sent to', coachProfile.email)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[checkin-report] Error:', err)
    return NextResponse.json({ ok: false })
  }
}
