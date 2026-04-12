'use client'

import { useState } from 'react'
import { ClientCard } from '@/components/coach/ClientCard'
import { Eyebrow } from '@/components/ui/Eyebrow'
import type { Client } from '@/lib/types'

interface ClientsListClientProps {
  active: Client[]
  inactive: Client[]
  weekNumbers: Record<string, number>
  midweekSubmitted: string[]
  weeklySubmitted: string[]
}

export function ClientsListClient({ active, inactive, weekNumbers, midweekSubmitted, weeklySubmitted }: ClientsListClientProps) {
  const [filterLoomUnsent, setFilterLoomUnsent] = useState(false)
  const [loomState, setLoomState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    ;[...active, ...inactive].forEach(c => { initial[c.id] = c.loom_sent ?? false })
    return initial
  })

  const midweekSet = new Set(midweekSubmitted)
  const weeklySet = new Set(weeklySubmitted)

  async function handleLoomToggle(clientId: string, sent: boolean) {
    setLoomState(prev => ({ ...prev, [clientId]: sent }))
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loom_sent: sent }),
    })
  }

  const filteredActive = filterLoomUnsent ? active.filter(c => !loomState[c.id]) : active
  const filteredInactive = filterLoomUnsent ? inactive.filter(c => !loomState[c.id]) : inactive

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6">
        <button
          onClick={() => setFilterLoomUnsent(v => !v)}
          className={`text-xs px-3 py-1.5 border transition-colors ${filterLoomUnsent ? 'border-blue-400 text-blue-400 bg-blue-400/10' : 'border-white/20 text-white/50 hover:border-white/50'}`}
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {filterLoomUnsent ? '✓ Showing: Loom not sent' : 'Filter: Loom not sent'}
        </button>
      </div>

      {/* Active clients */}
      <div className="mb-10">
        <Eyebrow className="block mb-3">
          Active — {filteredActive.length}
        </Eyebrow>
        {filteredActive.length === 0 ? (
          <p className="text-grey-muted text-sm">
            {filterLoomUnsent ? 'All active clients have had a Loom sent.' : 'No active clients yet. Add one above.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredActive.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                weekNumber={weekNumbers[client.id] ?? 1}
                midweekSubmitted={midweekSet.has(client.id)}
                weeklySubmitted={weeklySet.has(client.id)}
                loomSent={loomState[client.id]}
                onLoomToggle={(sent) => handleLoomToggle(client.id, sent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive clients */}
      {filteredInactive.length > 0 && (
        <div>
          <Eyebrow className="block mb-3">Inactive — {filteredInactive.length}</Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 opacity-50">
            {filteredInactive.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                weekNumber={weekNumbers[client.id] ?? 1}
                midweekSubmitted={midweekSet.has(client.id)}
                weeklySubmitted={weeklySet.has(client.id)}
                loomSent={loomState[client.id]}
                onLoomToggle={(sent) => handleLoomToggle(client.id, sent)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
