import { ClientCard } from '@/components/coach/ClientCard'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/types'

async function getClients(): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user.id)
    .eq('is_active', true)
    .order('full_name')
  return data ?? []
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

function getWeekNumber(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  return Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const clients = await getClients()
  const weekStart = getWeekStart()

  const [{ data: midweekRows }, { data: weeklyRows }] = await Promise.all([
    supabase
      .from('midweek_checks')
      .select('client_id')
      .gte('submitted_at', weekStart),
    supabase
      .from('weekly_checkins')
      .select('client_id')
      .gte('check_in_date', weekStart.split('T')[0]),
  ])

  const midweekSubmitted = new Set((midweekRows || []).map(r => r.client_id))
  const weeklySubmitted = new Set((weeklyRows || []).map(r => r.client_id))

  const totalActive = clients.filter(c => c.is_active).length
  const midweekCount = clients.filter(c => midweekSubmitted.has(c.id)).length
  const weeklyCount = clients.filter(c => weeklySubmitted.has(c.id)).length

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <Eyebrow>Overview</Eyebrow>
        <GoldRule className="mb-4" />
        <h1
          className="text-3xl text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Active Clients', value: totalActive, sub: 'currently enrolled' },
          { label: 'Midweek Submitted', value: midweekCount, sub: `of ${totalActive} clients` },
          { label: 'Weekly Check-Ins', value: weeklyCount, sub: `of ${totalActive} clients` },
        ].map((stat) => (
          <div key={stat.label} className="bg-navy-card border border-white/8 p-6">
            <Eyebrow className="block mb-2">{stat.label}</Eyebrow>
            <div
              className="text-4xl text-white mb-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {stat.value}
            </div>
            <div className="text-sm text-grey-muted">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* All clients */}
      <div>
        <Eyebrow>Active Clients</Eyebrow>
        <GoldRule />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              weekNumber={getWeekNumber(client.start_date)}
              midweekSubmitted={midweekSubmitted.has(client.id)}
              weeklySubmitted={weeklySubmitted.has(client.id)}
            />
          ))}
          {clients.length === 0 && (
            <p className="text-grey-muted col-span-3">No clients yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
