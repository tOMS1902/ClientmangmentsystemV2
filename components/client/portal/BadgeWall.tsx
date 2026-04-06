interface BadgeWallProps {
  unlockedKeys: string[]
}

const BADGES = [
  { key: 'first_month', label: 'First Month', description: '4 weeks complete', icon: '🗓' },
  { key: 'first_5kg', label: 'First 5kg', description: 'Lost first 5kg', icon: '⚡' },
  { key: 'first_race', label: 'Race Day', description: 'First race completed', icon: '🏁' },
  { key: 'vo2_improved', label: 'VO2 Max', description: 'VO2 max improved', icon: '❤️' },
  { key: 'bloodwork_optimised', label: 'Bloodwork', description: 'Bloodwork optimised', icon: '🔬' },
]

export function BadgeWall({ unlockedKeys }: BadgeWallProps) {
  return (
    <div>
      <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-label)', color: '#c9a84c', letterSpacing: '2px' }}>MILESTONES</p>
      <div className="grid grid-cols-5 gap-3">
        {BADGES.map(badge => {
          const unlocked = unlockedKeys.includes(badge.key)
          return (
            <div
              key={badge.key}
              className={`p-4 text-center border transition-all ${
                unlocked
                  ? 'bg-navy-card border-gold/50'
                  : 'bg-navy-card border-white/8 opacity-40'
              }`}
            >
              <div className="text-2xl mb-2">{badge.icon}</div>
              <p className={`text-xs font-semibold mb-0.5 ${unlocked ? 'text-gold' : 'text-grey-muted'}`} style={{ fontFamily: 'var(--font-label)' }}>
                {badge.label}
              </p>
              <p className="text-grey-muted" style={{ fontSize: '10px' }}>{badge.description}</p>
              {!unlocked && (
                <div className="mt-2 text-grey-muted opacity-50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ margin: '0 auto' }}>
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
