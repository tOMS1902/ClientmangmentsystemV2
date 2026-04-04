import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend } from '@/lib/email/resend'
import { buildCheckinReminderHtml } from '@/lib/email/templates/checkin-reminder'

// Vercel Cron sends Authorization: Bearer CRON_SECRET
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
  const todayDate = today.toISOString().split('T')[0]

  // Find active clients whose check-in day is today
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, full_name, email, user_id, start_date')
    .eq('is_active', true)
    .eq('check_in_day', todayName)

  if (error) {
    console.error('[checkin-reminder] Failed to fetch clients:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!clients?.length) {
    console.log(`[checkin-reminder] No clients with check-in day: ${todayName}`)
    return NextResponse.json({ sent: 0, day: todayName })
  }

  // Filter out clients who have already submitted this week
  // "This week" = check_in_date >= Monday of current week
  const monday = new Date(today)
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().split('T')[0]

  const clientIds = clients.map(c => c.id)
  const { data: alreadySubmitted } = await supabase
    .from('weekly_checkins')
    .select('client_id')
    .in('client_id', clientIds)
    .gte('check_in_date', weekStart)

  const submittedSet = new Set((alreadySubmitted ?? []).map(r => r.client_id))

  // Only email clients who haven't submitted yet AND have a portal account
  const toRemind = clients.filter(c => !submittedSet.has(c.id) && c.user_id)

  if (!toRemind.length) {
    console.log('[checkin-reminder] All clients already submitted or have no portal account')
    return NextResponse.json({ sent: 0, skipped: clients.length, day: todayName })
  }

  const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/checkin`
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'RuFlo Coaching <onboarding@resend.dev>'
  const resend = getResend()

  let sent = 0
  let failed = 0

  for (const client of toRemind) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: client.email,
        subject: `${client.full_name.split(' ')[0]}, your weekly check-in is due today`,
        html: buildCheckinReminderHtml(client.full_name, checkinUrl),
      })
      sent++
      console.log(`[checkin-reminder] Sent to ${client.email}`)
    } catch (err) {
      failed++
      console.error(`[checkin-reminder] Failed for ${client.email}:`, err)
    }
  }

  console.log(`[checkin-reminder] Done — sent: ${sent}, failed: ${failed}, day: ${todayName}, date: ${todayDate}`)
  return NextResponse.json({ sent, failed, day: todayName, date: todayDate })
}
