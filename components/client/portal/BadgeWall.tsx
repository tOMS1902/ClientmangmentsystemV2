interface BadgeWallProps {
  milestones: { id: string; label: string; is_unlocked: boolean }[]
}

export function BadgeWall({ milestones }: BadgeWallProps) {
  if (milestones.length === 0) return null

  return (
    <div>
      <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-label)', color: '#c9a84c', letterSpacing: '2px' }}>MILESTONES</p>
      <div className="flex flex-wrap gap-3">
        {milestones.map(m => (
          <div
            key={m.id}
            className={`p-4 text-center border bg-navy-card transition-opacity ${
              m.is_unlocked
                ? 'border-gold/50 opacity-100'
                : 'border-white/10 opacity-40'
            }`}
            style={{ minWidth: '100px' }}
          >
            <div className="text-2xl mb-2">{m.is_unlocked ? '🏅' : '🔒'}</div>
            <p
              className={`text-xs font-semibold ${m.is_unlocked ? 'text-gold' : 'text-white/60'}`}
              style={{ fontFamily: 'var(--font-label)' }}
            >
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
