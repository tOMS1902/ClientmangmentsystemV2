'use client'

import Link from 'next/link'
import type { Client } from '@/lib/types'

interface ClientCardProps {
  client: Client
  weekNumber: number
  midweekSubmitted: boolean
  weeklySubmitted: boolean
  legalOnboardingComplete?: boolean
  loomSent?: boolean
  onLoomToggle?: (sent: boolean) => void
}

export function ClientCard({ client, weekNumber, midweekSubmitted, weeklySubmitted, legalOnboardingComplete, loomSent, onLoomToggle }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`} className="block group">
      <div className="bg-navy-card border border-white/8 p-6 transition-all group-hover:border-l-2 group-hover:border-l-gold">
        <div className="mb-3">
          <span className="eyebrow">Week {weekNumber}</span>
        </div>
        <h3
          className="text-lg text-white mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {client.full_name}
          <span className="text-xs text-grey-muted ml-2">{client.region === 'US' ? '🇺🇸' : '🇪🇺'}</span>
        </h3>
        <div className="flex gap-3 text-xs flex-wrap">
          {client.user_id !== null && (
            <span className={legalOnboardingComplete ? 'text-green-400' : 'text-red-400'} title="Legal onboarding">
              {legalOnboardingComplete ? '✓ Legal' : '✗ Legal'}
            </span>
          )}
          <span className={weeklySubmitted ? 'text-green-400' : 'text-grey-muted'}>
            {weeklySubmitted ? '✓ Weekly' : '— Weekly'}
          </span>
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onLoomToggle?.(!loomSent) }}
            className={`text-xs transition-colors ${loomSent ? 'text-blue-400' : 'text-grey-muted hover:text-blue-400'}`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {loomSent ? '✓ Loom sent' : '— Loom'}
          </button>
        </div>
      </div>
    </Link>
  )
}
