import Link from 'next/link'
import type { Client, DailyLog } from '@/lib/types'

interface ClientCardProps {
  client: Client
  latestLog: DailyLog | null
  weekNumber: number
}

function getDaysAgo(dateStr: string | null): string {
  if (!dateStr) return 'No logs yet'
  const date = new Date(dateStr)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

export function ClientCard({ client, latestLog, weekNumber }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`} className="block group">
      <div className="bg-navy-card border border-white/8 p-6 transition-all group-hover:border-l-2 group-hover:border-l-gold">
        <div className="mb-3">
          <span className="eyebrow">Week {weekNumber}</span>
        </div>
        <h3
          className="text-lg text-white mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {client.full_name}
        </h3>
        <p className="text-sm text-grey-muted">
          Last log: {getDaysAgo(latestLog?.log_date || null)}
        </p>
      </div>
    </Link>
  )
}
