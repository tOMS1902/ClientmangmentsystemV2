// Legacy display labels for badges created before the dynamic system
const LEGACY_LABELS: Record<string, string> = {
  first_month: 'First Month',
  first_5kg: 'First 5kg',
  first_race: 'Race Day',
  vo2_improved: 'VO2 Max',
  bloodwork_optimised: 'Bloodwork',
}

interface BadgeWallProps {
  unlockedKeys: string[]
}

export function BadgeWall({ unlockedKeys }: BadgeWallProps) {
  if (!unlockedKeys.length) return null

  return (
    <div>
      <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-label)', color: '#c9a84c', letterSpacing: '2px' }}>MILESTONES</p>
      <div className="flex flex-wrap gap-3">
        {unlockedKeys.map(key => (
          <div
            key={key}
            className="p-4 text-center border bg-navy-card border-gold/50"
            style={{ minWidth: '100px' }}
          >
            <div className="text-2xl mb-2">🏅</div>
            <p className="text-xs font-semibold text-gold" style={{ fontFamily: 'var(--font-label)' }}>
              {LEGACY_LABELS[key] ?? key}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
