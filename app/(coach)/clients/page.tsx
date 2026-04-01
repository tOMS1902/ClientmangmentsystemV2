import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ClientCard } from '@/components/coach/ClientCard'
import { AddClientModal } from '@/components/coach/AddClientModal'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { Client } from '@/lib/types'

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

export default async function ClientsPage() {
  const supabase = await createServerSupabaseClient()
  const clients = await getClients()
  const weekStart = getWeekStart()

  const [{ data: midweekRows }, { data: weeklyRows }] = await Promise.all([
    supabase.from('midweek_checks').select('client_id').gte('submitted_at', weekStart),
    supabase.from('weekly_checkins').select('client_id').gte('check_in_date', weekStart.split('T')[0]),
  ])

  const midweekSubmitted = new Set((midweekRows || []).map(r => r.client_id))
  const weeklySubmitted = new Set((weeklyRows || []).map(r => r.client_id))

  const active = clients.filter(c => c.is_active)
  const inactive = clients.filter(c => !c.is_active)

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {active.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                weekNumber={getWeekNumber(client.start_date)}
                midweekSubmitted={midweekSubmitted.has(client.id)}
                weeklySubmitted={weeklySubmitted.has(client.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive clients */}
      {inactive.length > 0 && (
        <div>
          <Eyebrow className="block mb-3">Inactive — {inactive.length}</Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 opacity-50">
            {inactive.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                weekNumber={getWeekNumber(client.start_date)}
                midweekSubmitted={midweekSubmitted.has(client.id)}
                weeklySubmitted={weeklySubmitted.has(client.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
