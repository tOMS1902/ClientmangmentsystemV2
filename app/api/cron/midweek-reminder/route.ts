import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend } from '@/lib/email/resend'
import { buildMidweekReminderHtml } from '@/lib/email/templates/midweek-reminder'

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  const todayName = DAYS[today.getDay()]

  // Find active clients whose midweek_check_day is today and midweek is enabled
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, full_name, email, user_id')
    .eq('is_active', true)
    .eq('midweek_check_day', todayName)
    .eq('midweek_check_enabled', true)

  if (error) {
    console.error('[midweek-reminder] Failed to fetch clients:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!clients?.length) {
    console.log(`[midweek-reminder] No clients with midweek day: ${todayName}`)
    return NextResponse.json({ sent: 0, day: todayName })
  }

  // Filter out clients who already submitted a midweek check this week
  const monday = new Date(today)
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString()

  const clientIds = clients.map(c => c.id)
  const { data: alreadySubmitted } = await supabase
    .from('midweek_checks')
    .select('client_id')
    .in('client_id', clientIds)
    .gte('submitted_at', weekStart)

  const submittedSet = new Set((alreadySubmitted ?? []).map(r => r.client_id))

  const toRemind = clients.filter(c => !submittedSet.has(c.id) && c.user_id)

  if (!toRemind.length) {
    console.log('[midweek-reminder] All clients already submitted or have no portal account')
    return NextResponse.json({ sent: 0, skipped: clients.length, day: todayName })
  }

  const midweekUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/checkin/midweek`
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'Legal Edge <onboarding@resend.dev>'
  const resend = getResend()

  let sent = 0
  let failed = 0

  for (const client of toRemind) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: client.email,
        subject: `${client.full_name.split(' ')[0]}, your midweek check-in is due today`,
        html: buildMidweekReminderHtml(client.full_name, midweekUrl),
      })
      sent++
      console.log(`[midweek-reminder] Sent to ${client.email}`)
    } catch (err) {
      failed++
      console.error(`[midweek-reminder] Failed for ${client.email}:`, err)
    }
  }

  console.log(`[midweek-reminder] Done — sent: ${sent}, failed: ${failed}, day: ${todayName}`)
  return NextResponse.json({ sent, failed, day: todayName })
}
