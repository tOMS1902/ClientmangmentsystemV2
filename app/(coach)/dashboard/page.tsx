import { ClientCard } from '@/components/coach/ClientCard'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Client, DailyLog } from '@/lib/types'

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

async function getLatestLog(clientId: string): Promise<DailyLog | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('log_date', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

function getWeekNumber(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  return Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

function getDaysWithoutLog(latestLog: DailyLog | null): number {
  if (!latestLog) return 999
  const lastDate = new Date(latestLog.log_date)
  const today = new Date()
  return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage() {
  const clients = await getClients()

  const clientsWithLogs = await Promise.all(
    clients.map(async (client) => ({
      client,
      latestLog: await getLatestLog(client.id),
      weekNumber: getWeekNumber(client.start_date),
    }))
  )

  const needsAttention = clientsWithLogs.filter(
    ({ latestLog }) => getDaysWithoutLog(latestLog) >= 3
  )

  const totalActive = clients.filter(c => c.is_active).length
  const checkedInThisWeek = clientsWithLogs.filter(({ latestLog }) => {
    if (!latestLog) return false
    const daysDiff = getDaysWithoutLog(latestLog)
    return daysDiff <= 7
  }).length

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
          { label: 'Logged This Week', value: checkedInThisWeek, sub: 'of ' + totalActive + ' clients' },
          { label: 'Need Attention', value: needsAttention.length, sub: 'no log in 3+ days' },
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

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <div className="mb-10">
          <Eyebrow>Requires Attention</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-2">
            {needsAttention.map(({ client, latestLog }) => {
              const daysAgo = getDaysWithoutLog(latestLog)
              return (
                <div key={client.id} className="flex items-center justify-between py-3 border-b border-white/8">
                  <div>
                    <span className="text-white">{client.full_name}</span>
                    <span className="text-grey-muted text-sm ml-3">
                      {daysAgo >= 999 ? 'Never logged' : `No log in ${daysAgo} days`}
                    </span>
                  </div>
                  <a
                    href={`/clients/${client.id}`}
                    className="text-gold text-sm"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    View Client &rarr;
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All clients */}
      <div>
        <Eyebrow>Active Clients</Eyebrow>
        <GoldRule />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {clientsWithLogs.map(({ client, latestLog, weekNumber }) => (
            <ClientCard
              key={client.id}
              client={client}
              latestLog={latestLog}
              weekNumber={weekNumber}
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
