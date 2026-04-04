import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getResend } from '@/lib/email/resend'
import { reportSystemPrompt } from '@/lib/ai/report-prompt'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

const anthropic = new Anthropic()

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  // Get all check-ins submitted today
  const { data: checkins, error } = await supabase
    .from('weekly_checkins')
    .select('*')
    .eq('check_in_date', today)

  if (error) {
    console.error('[daily-checkin-report] DB error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!checkins?.length) {
    console.log('[daily-checkin-report] No check-ins today')
    return NextResponse.json({ sent: 0, date: today })
  }

  // Group check-ins by coach (via clients table)
  const clientIds = checkins.map(c => c.client_id)
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, coach_id, goal_weight')
    .in('id', clientIds)

  if (!clients?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Get all unique coach IDs
  const coachIds = [...new Set(clients.map(c => c.coach_id))]

  // Get coach profiles (email)
  const { data: coaches } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', coachIds)

  if (!coaches?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Get recent check-ins for context (last 6 per client)
  const { data: recentCheckins } = await supabase
    .from('weekly_checkins')
    .select('*')
    .in('client_id', clientIds)
    .order('check_in_date', { ascending: false })

  const resend = getResend()
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'RuFlo Coaching <onboarding@resend.dev>'
  let emailsSent = 0

  // For each coach, build one combined email
  for (const coach of coaches) {
    if (!coach.email) continue

    const coachClients = clients.filter(c => c.coach_id === coach.id)
    const coachCheckins = checkins.filter(c =>
      coachClients.some(cl => cl.id === c.client_id)
    )

    if (!coachCheckins.length) continue

    // Generate AI summary for each client check-in
    const clientSections: string[] = []

    for (const checkin of coachCheckins) {
      const client = coachClients.find(c => c.id === checkin.client_id)
      if (!client) continue

      const clientRecent = (recentCheckins ?? [])
        .filter(r => r.client_id === checkin.client_id)
        .slice(0, 6)
      const prev = clientRecent[1] ?? null
      const weightChange = prev ? (checkin.weight - prev.weight).toFixed(1) : null

      const context = `
Client: ${client.full_name}
Week: ${checkin.week_number}
Current weight: ${checkin.weight}kg (goal: ${client.goal_weight}kg)
Weight change: ${weightChange !== null ? `${Number(weightChange) >= 0 ? '+' : ''}${weightChange}kg` : 'First check-in'}
Week score: ${checkin.week_score ?? 'N/A'}/10
Energy: ${checkin.energy_score ?? checkin.energy_summary ?? 'N/A'}
Sleep: ${checkin.sleep_score ?? checkin.sleep_summary ?? 'N/A'}
Diet: ${checkin.diet_rating ?? checkin.diet_summary ?? 'N/A'}
Training: ${checkin.training_completed ?? checkin.training_sessions ?? 'N/A'}
Avg steps: ${checkin.avg_steps ?? 'N/A'}
Biggest win: ${checkin.biggest_win ?? 'N/A'}
Main challenge: ${checkin.main_challenge ?? 'N/A'}
Improve next week: ${checkin.improve_next_week ?? checkin.focus_next_week ?? 'N/A'}
Support needed: ${checkin.coach_support ?? 'N/A'}
Recent weight trend: ${clientRecent.map((r: { weight: number }) => `${r.weight}kg`).join(', ')}
`.trim()

      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: reportSystemPrompt,
          messages: [{ role: 'user', content: context }],
        })
        const textContent = message.content[0]
        if (textContent.type === 'text') {
          const report = JSON.parse(textContent.text)
          clientSections.push(buildClientSection(report, client.full_name, checkin.client_id))
        }
      } catch (err) {
        console.error(`[daily-checkin-report] AI error for ${client.full_name}:`, err)
        clientSections.push(`<div style="margin-bottom:32px;"><h3 style="color:#fff;">${client.full_name}</h3><p style="color:#9ca3af;">Could not generate AI summary.</p></div>`)
      }
    }

    // Build and send the combined email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const html = buildDailyReportHtml(coach.full_name, today, clientSections, appUrl)
    const subject = `Daily Check-In Report — ${coachCheckins.length} submission${coachCheckins.length > 1 ? 's' : ''} (${today})`

    try {
      await resend.emails.send({ from: fromEmail, to: coach.email, subject, html })
      emailsSent++
      console.log(`[daily-checkin-report] Sent to ${coach.email} covering ${coachCheckins.length} clients`)
    } catch (err) {
      console.error(`[daily-checkin-report] Failed to send to ${coach.email}:`, err)
    }
  }

  return NextResponse.json({ sent: emailsSent, checkins: checkins.length, date: today })
}

function buildClientSection(report: {
  headline: string
  summary: string
  flags: string[]
  clientWords: { biggestWin: string; mainChallenge: string }
  suggestions: string[]
}, clientName: string, clientId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const flagsHtml = report.flags.length
    ? report.flags.map(f => `<li style="color:#f87171;margin-bottom:4px;">${f}</li>`).join('')
    : '<li style="color:#9ca3af;">No major flags</li>'

  const suggestionsHtml = report.suggestions
    .map(s => `<li style="color:#e5e7eb;margin-bottom:4px;">${s}</li>`)
    .join('')

  return `
<div style="margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid #1e2d42;">
  <h2 style="margin:0 0 4px;font-size:18px;color:#ffffff;font-family:Georgia,serif;">${clientName}</h2>
  <p style="margin:0 0 16px;font-size:13px;color:#c9a84c;font-family:Arial,sans-serif;">${report.headline}</p>

  <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#d1d5db;">${report.summary}</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td width="48%" style="vertical-align:top;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:#c9a84c;font-family:Arial,sans-serif;">FLAGS</p>
        <ul style="margin:0;padding-left:18px;">${flagsHtml}</ul>
      </td>
      <td width="4%"></td>
      <td width="48%" style="vertical-align:top;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:#c9a84c;font-family:Arial,sans-serif;">SUGGESTIONS</p>
        <ul style="margin:0;padding-left:18px;">${suggestionsHtml}</ul>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td width="48%" style="background:#1a2332;padding:12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">WIN</p>
        <p style="margin:0;font-size:13px;color:#e5e7eb;font-style:italic;">"${report.clientWords.biggestWin}"</p>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background:#1a2332;padding:12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">CHALLENGE</p>
        <p style="margin:0;font-size:13px;color:#e5e7eb;font-style:italic;">"${report.clientWords.mainChallenge}"</p>
      </td>
    </tr>
  </table>

  <a href="${appUrl}/clients/${clientId}" style="font-size:12px;color:#c9a84c;font-family:Arial,sans-serif;">View profile →</a>
</div>`
}

function buildDailyReportHtml(coachName: string, date: string, sections: string[], appUrl: string): string {
  const firstName = coachName.split(' ')[0]
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1623;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1623;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #c9a84c;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;">RUFLO COACHING</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;">Daily Check-In Report</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif;">${date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 24px;font-size:15px;color:#d1d5db;">Hi ${firstName}, here's a summary of today's check-ins.</p>
              ${sections.join('')}
              <a href="${appUrl}/clients" style="display:inline-block;background:#c9a84c;color:#0f1623;padding:12px 24px;font-size:12px;font-family:Arial,sans-serif;font-weight:700;text-decoration:none;letter-spacing:1px;margin-top:8px;">VIEW ALL CLIENTS</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0;border-top:1px solid #1e2d42;margin-top:32px;">
              <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">Generated automatically by RuFlo AI at end of day.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
