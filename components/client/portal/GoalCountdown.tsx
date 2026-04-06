interface GoalCountdownProps {
  goalEventName?: string | null
  goalEventDate?: string | null
  goalWeight?: number
  currentWeight?: number
}

export function GoalCountdown({ goalEventName, goalEventDate, goalWeight, currentWeight }: GoalCountdownProps) {
  if (goalEventDate && goalEventName) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(goalEventDate)
    const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (days < 0) return null

    return (
      <div className="bg-navy-card border border-gold/30 p-5">
        <p className="text-xs text-gold mb-1" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>GOAL COUNTDOWN</p>
        <p className="text-3xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {days} <span className="text-lg text-grey-muted">days</span>
        </p>
        <p className="text-grey-muted text-sm">to {goalEventName}</p>
      </div>
    )
  }

  if (goalWeight && currentWeight && goalWeight !== currentWeight) {
    const remaining = Math.abs(currentWeight - goalWeight).toFixed(1)
    const direction = currentWeight > goalWeight ? 'to lose' : 'to gain'
    return (
      <div className="bg-navy-card border border-white/8 p-5">
        <p className="text-xs text-gold mb-1" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>GOAL</p>
        <p className="text-3xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {remaining}<span className="text-lg text-grey-muted">kg</span>
        </p>
        <p className="text-grey-muted text-sm">{direction} reach {goalWeight}kg</p>
      </div>
    )
  }

  return null
}
