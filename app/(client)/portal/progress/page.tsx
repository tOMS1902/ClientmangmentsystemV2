import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { WeeklyCheckin, DailyLog, Client } from '@/lib/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${APP_URL}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Goal line */}
      <line
        x1={padL} y1={goalY} x2={width - padR} y2={goalY}
        stroke="#8892a4" strokeWidth="1" strokeDasharray="4,4"
      />
      <text x={width - padR + 2} y={goalY + 4} fill="#8892a4" fontSize="10">Goal</text>

      {/* Weight line */}
      <polyline points={polyline} fill="none" stroke="#b8962e" strokeWidth="2" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#b8962e" />
          <text x={p.x} y={p.y - 8} fill="rgba(255,255,255,0.7)" fontSize="10" textAnchor="middle">
            {p.weight}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 5} fill="#8892a4" fontSize="10" textAnchor="middle">
          W{p.week}
        </text>
      ))}

      {/* Y-axis labels */}
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

function LogHeatmap({ logs }: { logs: DailyLog[] }) {
  const days = 60
  const today = new Date()
  const logDates = new Set(logs.map(l => l.log_date))
  const todayStr = today.toISOString().split('T')[0]
  const loggedCount = [...Array(days)].filter((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    return logDates.has(d.toISOString().split('T')[0])
  }).length

  return (
    <div>
      <p className="text-sm text-grey-muted mb-3">{loggedCount} days logged out of last {days}</p>
      <div className="flex flex-wrap gap-1">
        {[...Array(days)].map((_, i) => {
          const d = new Date(today)
          d.setDate(today.getDate() - (days - 1 - i))
          const dateStr = d.toISOString().split('T')[0]
          const isToday = dateStr === todayStr
          const logged = logDates.has(dateStr)
          return (
            <div
              key={dateStr}
              title={dateStr}
              className="w-4 h-4"
              style={{
                backgroundColor: logged ? 'rgba(184,150,46,0.8)' : '#152b4e',
                border: isToday ? '1px solid #b8962e' : '1px solid transparent',
              }}
            />
          )
        })}
      </div>
    </div>
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

  const [checkins, logs] = await Promise.all([
    fetchJson<WeeklyCheckin[]>(`/api/checkins/${clientId}`),
    fetchJson<DailyLog[]>(`/api/logs/${clientId}?limit=60`),
  ])

  const sortedCheckins = [...(checkins || [])].sort((a, b) => a.week_number - b.week_number)

  // Weekly comparison
  const today = new Date()
  const thisWeekLogs = (logs || []).filter(l => {
    const diff = (today.getTime() - new Date(l.log_date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const lastWeekLogs = (logs || []).filter(l => {
    const diff = (today.getTime() - new Date(l.log_date).getTime()) / (1000 * 60 * 60 * 24)
    return diff > 7 && diff <= 14
  })

  function avg(arr: DailyLog[], field: keyof DailyLog): number {
    if (!arr.length) return 0
    const values = arr.map(l => (l[field] as number | null) || 0)
    return Math.round(values.reduce((a, b) => a + b, 0) / arr.length)
  }

  const comparison = [
    { label: 'Avg Calories', this: avg(thisWeekLogs, 'calories'), last: avg(lastWeekLogs, 'calories'), higherIsBetter: true },
    { label: 'Avg Protein', this: avg(thisWeekLogs, 'protein'), last: avg(lastWeekLogs, 'protein'), higherIsBetter: true },
    { label: 'Avg Steps', this: avg(thisWeekLogs, 'steps'), last: avg(lastWeekLogs, 'steps'), higherIsBetter: true },
    { label: 'Avg Sleep', this: avg(thisWeekLogs, 'sleep_hours'), last: avg(lastWeekLogs, 'sleep_hours'), higherIsBetter: true },
  ]

  const totalWeeks = checkins?.length ? Math.max(...checkins.map(c => c.week_number)) : 0
  const latestCheckin = checkins?.[0]
  const totalLost = latestCheckin && clientRecord.start_weight
    ? Math.max(0, clientRecord.start_weight - latestCheckin.weight)
    : 0

  function arrow(thisVal: number, lastVal: number, higherIsBetter: boolean): string {
    if (thisVal > lastVal) return higherIsBetter ? '↑' : '↓'
    if (thisVal < lastVal) return higherIsBetter ? '↓' : '↑'
    return '→'
  }

  function arrowColor(thisVal: number, lastVal: number, higherIsBetter: boolean): string {
    if (thisVal === lastVal) return 'text-grey-muted'
    const better = higherIsBetter ? thisVal > lastVal : thisVal < lastVal
    return better ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div>
      <div className="mb-8">
        <Eyebrow>Your Progress</Eyebrow>
        <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>Progress</h1>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-navy-card border border-white/8 p-5">
          <Eyebrow className="block mb-2">Total Weeks</Eyebrow>
          <div className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>{totalWeeks}</div>
        </div>
        <div className="bg-navy-card border border-white/8 p-5">
          <Eyebrow className="block mb-2">Total Lost</Eyebrow>
          <div className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>{totalLost.toFixed(1)}kg</div>
        </div>
      </div>

      {/* Weight chart */}
      <div className="bg-navy-card border border-white/8 p-6 mb-8">
        <Eyebrow>Weight History</Eyebrow>
        <GoldRule />
        <div className="mt-4">
          <WeightChart checkins={sortedCheckins} goalWeight={clientRecord.goal_weight} />
        </div>
      </div>

      {/* Logging consistency */}
      <div className="bg-navy-card border border-white/8 p-6 mb-8">
        <Eyebrow>Logging Consistency</Eyebrow>
        <GoldRule />
        <div className="mt-4">
          <LogHeatmap logs={logs || []} />
        </div>
      </div>

      {/* Weekly comparison */}
      <div className="bg-navy-card border border-white/8 p-6">
        <Eyebrow>Weekly Comparison</Eyebrow>
        <GoldRule />
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-grey-muted border-b border-white/8">
              <th className="text-left py-2 font-normal">Metric</th>
              <th className="text-left py-2 font-normal">This Week</th>
              <th className="text-left py-2 font-normal">Last Week</th>
              <th className="text-left py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {comparison.map(row => (
              <tr key={row.label} className="border-b border-white/8">
                <td className="py-2.5 text-grey-muted">{row.label}</td>
                <td className="py-2.5 text-white">{row.this.toLocaleString()}</td>
                <td className="py-2.5 text-white/70">{row.last.toLocaleString()}</td>
                <td className={`py-2.5 font-bold ${arrowColor(row.this, row.last, row.higherIsBetter)}`}>
                  {arrow(row.this, row.last, row.higherIsBetter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
