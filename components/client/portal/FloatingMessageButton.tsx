'use client'

import Link from 'next/link'

interface FloatingMessageButtonProps {
  coachName: string
  coachAvatarUrl?: string | null
}

export function FloatingMessageButton({ coachName, coachAvatarUrl }: FloatingMessageButtonProps) {
  const initials = coachName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Link href="/portal/messages">
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-navy-card border border-gold/50 shadow-lg cursor-pointer hover:border-gold transition-colors"
        style={{ padding: '10px 16px 10px 10px' }}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gold/30 flex items-center justify-center bg-navy-deep">
          {coachAvatarUrl ? (
            <img src={coachAvatarUrl} alt={coachName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gold text-sm font-semibold" style={{ fontFamily: 'var(--font-label)' }}>{initials}</span>
          )}
        </div>
        <div>
          <p className="text-white text-xs font-semibold" style={{ fontFamily: 'var(--font-label)' }}>Message Coach</p>
          <p className="text-grey-muted text-xs">{coachName.split(' ')[0]}</p>
        </div>
      </div>
    </Link>
  )
}
