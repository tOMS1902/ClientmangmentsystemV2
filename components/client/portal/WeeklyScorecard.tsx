'use client'

interface ScorecardProps {
  trainingCompleted: string | null
  dietRating: string | null
  sleepScore: number | null
  checkinSubmittedThisWeek: boolean
}

function getTrainingPct(v: string | null): number | null {
  if (!v) return null
  if (v === 'all') return 100
  if (v === 'missed_1') return 75
  if (v === 'missed_2plus') return 50
  if (v === 'none') return 0
  return null
}

function getDietPct(v: string | null): number | null {
  if (!v) return null
  if (v === 'on_track') return 100
  if (v === 'mostly_on_track') return 75
  if (v === 'mixed') return 50
  if (v === 'off_track') return 0
  return null
}

function colorForPct(pct: number | null): string {
  if (pct === null) return 'text-grey-muted'
  if (pct >= 75) return 'text-green-400'
  if (pct >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function borderForPct(pct: number | null): string {
  if (pct === null) return 'border-white/8'
  if (pct >= 75) return 'border-green-700'
  if (pct >= 50) return 'border-amber-700'
  return 'border-red-700'
}

export function WeeklyScorecard({ trainingCompleted, dietRating, sleepScore, checkinSubmittedThisWeek }: ScorecardProps) {
  const trainingPct = getTrainingPct(trainingCompleted)
  const dietPct = getDietPct(dietRating)
  const sleepPct = sleepScore != null ? Math.round((sleepScore / 10) * 100) : null
  const checkinPct = checkinSubmittedThisWeek ? 100 : 0

  const cards = [
    { label: 'Training', value: trainingPct !== null ? `${trainingPct}%` : '—', pct: trainingPct },
    { label: 'Nutrition', value: dietPct !== null ? `${dietPct}%` : '—', pct: dietPct },
    { label: 'Sleep', value: sleepPct !== null ? `${sleepPct}%` : '—', pct: sleepPct },
    { label: 'Check-In', value: checkinSubmittedThisWeek ? 'Done' : 'Due', pct: checkinPct },
  ]

  return (
    <div>
      <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-label)', color: '#c9a84c', letterSpacing: '2px' }}>THIS WEEK</p>
      <div className="grid grid-cols-4 gap-3">
        {cards.map(card => (
          <div key={card.label} className={`bg-navy-card border p-4 ${borderForPct(card.pct)}`}>
            <p className="text-grey-muted text-xs mb-2" style={{ fontFamily: 'var(--font-label)' }}>{card.label.toUpperCase()}</p>
            <p className={`text-2xl font-semibold ${colorForPct(card.pct)}`} style={{ fontFamily: 'var(--font-display)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
