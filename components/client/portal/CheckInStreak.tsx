import type { WeeklyCheckin } from '@/lib/types'

interface CheckInStreakProps {
  checkins: WeeklyCheckin[]
}

function calculateStreak(checkins: WeeklyCheckin[]): number {
  if (!checkins.length) return 0
  // Sorted newest first (already ordered that way from DB)
  const sorted = [...checkins].sort((a, b) => b.week_number - a.week_number)
  let streak = 0
  let expectedWeek = sorted[0].week_number

  for (const checkin of sorted) {
    if (checkin.week_number !== expectedWeek) break
    const trainingOk = !checkin.training_completed || checkin.training_completed === 'all' || checkin.training_completed === 'missed_1'
    if (!trainingOk) break
    streak++
    expectedWeek--
  }
  return streak
}

export function CheckInStreak({ checkins }: CheckInStreakProps) {
  const streak = calculateStreak(checkins)

  return (
    <div className="bg-navy-card border border-white/8 p-5 flex items-center justify-between">
      <div>
        <p className="text-xs text-grey-muted mb-1" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>COMPLIANCE STREAK</p>
        <p className="text-4xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {streak}
          <span className="text-lg text-grey-muted ml-1">{streak === 1 ? 'week' : 'weeks'}</span>
        </p>
        <p className="text-grey-muted text-xs mt-1">consecutive weeks of full compliance</p>
      </div>
      <div className="text-gold opacity-60">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
    </div>
  )
}
