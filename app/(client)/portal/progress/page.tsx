import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { WeeklyCheckin, Client, NutritionTargets } from '@/lib/types'

function WeightChart({ checkins, goalWeight }: { checkins: WeeklyCheckin[]; goalWeight: number }) {
  if (checkins.length < 2) return <p className="text-grey-muted text-sm">Not enough data yet.</p>

  const sorted = [...checkins].sort((a, b) => a.week_number - b.week_number)
  const weights = sorted.map(c => c.weight)
  const minW = Math.min(...weights, goalWeight) - 2
  const maxW = Math.max(...weights) + 2
  const range = maxW - minW

  const width = 600
  const height = 200
  const padL = 40
  const padR = 20
  const padT = 20
  const padB = 30

  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const points = sorted.map((c, i) => {
    const x = padL + (i / (sorted.length - 1)) * chartW
    const y = padT + ((maxW - c.weight) / range) * chartH
    return { x, y, week: c.week_number, weight: c.weight }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const goalY = padT + ((maxW - goalWeight) / range) * chartH

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <line
        x1={padL} y1={goalY} x2={width - padR} y2={goalY}
        stroke="#8892a4" strokeWidth="1" strokeDasharray="4,4"
      />
      <text x={width - padR + 2} y={goalY + 4} fill="#8892a4" fontSize="10">Goal</text>
      <polyline points={polyline} fill="none" stroke="#b8962e" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#b8962e" />
          <text x={p.x} y={p.y - 8} fill="rgba(255,255,255,0.7)" fontSize="10" textAnchor="middle">
            {p.weight}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 5} fill="#8892a4" fontSize="10" textAnchor="middle">
          W{p.week}
        </text>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const val = Math.round(maxW - frac * range)
        const y = padT + frac * chartH
        return (
          <text key={frac} x={padL - 5} y={y + 4} fill="#8892a4" fontSize="10" textAnchor="end">
            {val}
          </text>
        )
      })}
    </svg>
  )
}

export default async function ProgressPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return <p className="text-grey-muted">Client record not found.</p>

  const clientId = clientRecord.id

  const [{ data: checkins }] = await Promise.all([
    supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('week_number', { ascending: false }),
  ])

  const sortedCheckins = [...(checkins || [])].sort((a, b) => a.week_number - b.week_number)

  const totalWeeks = checkins?.length ? Math.max(...checkins.map(c => c.week_number)) : 0
  const latestCheckin = checkins?.[0]
  const latestWeight = latestCheckin?.weight ?? null
  const totalLost = latestWeight != null && clientRecord.start_weight
    ? Math.max(0, clientRecord.start_weight - latestWeight)
    : 0

  return (
    <div>
      <div className="mb-8">
        <Eyebrow>Your Progress</Eyebrow>
        <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>Progress</h1>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-navy-card border border-white/8 p-5">
          <Eyebrow className="block mb-2">Total Weeks</Eyebrow>
          <div className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>{totalWeeks}</div>
        </div>
        {clientRecord.track_weight && (
          <div className="bg-navy-card border border-white/8 p-5">
            <Eyebrow className="block mb-2">Total Lost</Eyebrow>
            <div className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>{totalLost.toFixed(1)}kg</div>
          </div>
        )}
      </div>

      {/* Weight chart */}
      {clientRecord.track_weight && (
        <div className="bg-navy-card border border-white/8 p-6 mb-8">
          <Eyebrow>Weight History</Eyebrow>
          <GoldRule />
          <div className="mt-4">
            <WeightChart checkins={sortedCheckins} goalWeight={clientRecord.goal_weight} />
          </div>
        </div>
      )}

      {/* Check-in history */}
      {checkins && checkins.length > 0 && (
        <div className="bg-navy-card border border-white/8 p-6">
          <Eyebrow>Check-In History</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-3 mt-4">
            {checkins.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/8 text-sm">
                <span className="text-grey-muted">Week {c.week_number}</span>
                <span className="text-white">{c.weight ? `${c.weight}kg` : '—'}</span>
                <span className="text-grey-muted">
                  {new Date(c.check_in_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
