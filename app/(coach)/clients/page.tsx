import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ClientCard } from '@/components/coach/ClientCard'
import { AddClientModal } from '@/components/coach/AddClientModal'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { Client, DailyLog } from '@/lib/types'

async function getClients(): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user.id)
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
    .maybeSingle()
  return data ?? null
}

function getWeekNumber(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  return Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

export default async function ClientsPage() {
  const clients = await getClients()

  const clientsWithLogs = await Promise.all(
    clients.map(async (client) => ({
      client,
      latestLog: await getLatestLog(client.id),
      weekNumber: getWeekNumber(client.start_date),
    }))
  )

  const active = clientsWithLogs.filter(({ client }) => client.is_active)
  const inactive = clientsWithLogs.filter(({ client }) => !client.is_active)

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Eyebrow>Roster</Eyebrow>
          <GoldRule className="mb-4" />
          <h1
            className="text-3xl text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Clients
          </h1>
        </div>
        <AddClientModal />
      </div>

      {/* Active clients */}
      <div className="mb-10">
        <Eyebrow className="block mb-3">
          Active — {active.length}
        </Eyebrow>
        {active.length === 0 ? (
          <p className="text-grey-muted text-sm">No active clients yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(({ client, latestLog, weekNumber }) => (
              <ClientCard
                key={client.id}
                client={client}
                latestLog={latestLog}
                weekNumber={weekNumber}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive clients */}
      {inactive.length > 0 && (
        <div>
          <Eyebrow className="block mb-3">Inactive — {inactive.length}</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {inactive.map(({ client, latestLog, weekNumber }) => (
              <ClientCard
                key={client.id}
                client={client}
                latestLog={latestLog}
                weekNumber={weekNumber}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
