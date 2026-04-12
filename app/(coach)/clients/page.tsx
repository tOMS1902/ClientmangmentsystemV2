import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ClientsListClient } from '@/components/coach/ClientsListClient'
import { AddClientModal } from '@/components/coach/AddClientModal'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { Client } from '@/lib/types'

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
  const { data: { user } } = await supabase.auth.getUser()
  const weekStart = getWeekStart()

  const { data: clients } = user ? await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user.id)
    .order('full_name') : { data: [] }

  const [{ data: midweekRows }, { data: weeklyRows }] = await Promise.all([
    supabase.from('midweek_checks').select('client_id').gte('submitted_at', weekStart),
    supabase.from('weekly_checkins').select('client_id').gte('check_in_date', weekStart.split('T')[0]),
  ])

  const midweekSubmitted = (midweekRows || []).map(r => r.client_id)
  const weeklySubmitted = (weeklyRows || []).map(r => r.client_id)

  const allClients: Client[] = clients ?? []
  const active = allClients.filter(c => c.is_active)
  const inactive = allClients.filter(c => !c.is_active)

  const weekNumbers: Record<string, number> = {}
  allClients.forEach(c => { weekNumbers[c.id] = getWeekNumber(c.start_date) })

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

      <ClientsListClient
        active={active}
        inactive={inactive}
        weekNumbers={weekNumbers}
        midweekSubmitted={midweekSubmitted}
        weeklySubmitted={weeklySubmitted}
      />
    </div>
  )
}
