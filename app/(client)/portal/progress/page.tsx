import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { WeeklyCheckin, DailyLog, Client, NutritionTargets } from '@/lib/types'

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

  const [
    { data: checkins },
    { data: logs },
    { data: targets },
  ] = await Promise.all([
    supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('week_number', { ascending: false }),
    supabase.from('daily_logs').select('*').eq('client_id', clientId).order('log_date', { ascending: false }).limit(35),
    supabase.from('nutrition_targets').select('*').eq('client_id', clientId).maybeSingle<NutritionTargets>(),
  ])

  const sortedCheckins = [...(checkins || [])].sort((a, b) => a.week_number - b.week_number)

  // 4-week rolling comparison
  const now = new Date()
  function wkBucket(n: number): DailyLog[] {
    return (logs || []).filter(l => {
      const d = (now.getTime() - new Date(l.log_date).getTime()) / 86400000
      return d >= n * 7 && d < (n + 1) * 7
    })
  }
  const [w0, w1, w2, w3] = [0, 1, 2, 3].map(wkBucket)

  function avgInt(arr: DailyLog[], field: keyof DailyLog): number {
    if (!arr.length) return 0
    return Math.round(arr.map(l => (l[field] as number | null) || 0).reduce((a, b) => a + b, 0) / arr.length)
  }
  function avgDec(arr: DailyLog[], field: keyof DailyLog): number {
    if (!arr.length) return 0
    return Math.round(arr.map(l => (l[field] as number | null) || 0).reduce((a, b) => a + b, 0) / arr.length * 10) / 10
  }
  function pctColor(val: number, tgt: number | null | undefined): string {
    if (!tgt || !val) return 'text-white'
    const p = val / tgt
    if (p >= 0.95) return 'text-green-400'
    if (p >= 0.80) return 'text-amber-400'
    return 'text-red-400'
  }
  function trendArrow(cur: number, prev: number): string {
    return cur > prev ? '↑' : cur < prev ? '↓' : '→'
  }
  function trendColor(cur: number, prev: number): string {
    if (cur === prev) return 'text-grey-muted'
    return cur > prev ? 'text-green-400' : 'text-red-400'
  }

  const totalWeeks = checkins?.length ? Math.max(...checkins.map(c => c.week_number)) : 0
  const latestCheckin = checkins?.[0]
  const totalLost = latestCheckin && clientRecord.start_weight
    ? Math.max(0, clientRecord.start_weight - latestCheckin.weight)
    : 0

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
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-grey-muted border-b border-white/8">
                <th className="text-left py-2 font-normal">Metric</th>
                <th className="text-left py-2 font-normal">This Week</th>
                <th className="text-left py-2 font-normal">Last Week</th>
                <th className="text-left py-2 font-normal">2 Wks Ago</th>
                <th className="text-left py-2 font-normal">3 Wks Ago</th>
                {targets && <th className="text-left py-2 font-normal">Target</th>}
              </tr>
            </thead>
            <tbody>
              {([
                { label: 'Avg Calories', vals: [w0, w1, w2, w3].map(w => avgInt(w, 'calories')), tgt: targets?.td_calories ?? null, fmt: (v: number) => v ? v.toLocaleString() : '—', tgtFmt: (t: number) => t.toLocaleString() },
                { label: 'Avg Protein', vals: [w0, w1, w2, w3].map(w => avgInt(w, 'protein')), tgt: targets?.td_protein ?? null, fmt: (v: number) => v ? `${v}g` : '—', tgtFmt: (t: number) => `${t}g` },
                { label: 'Avg Steps', vals: [w0, w1, w2, w3].map(w => avgInt(w, 'steps')), tgt: targets?.daily_steps ?? null, fmt: (v: number) => v ? v.toLocaleString() : '—', tgtFmt: (t: number) => t.toLocaleString() },
                { label: 'Avg Sleep', vals: [w0, w1, w2, w3].map(w => avgDec(w, 'sleep_hours')), tgt: targets?.sleep_target_hours ?? null, fmt: (v: number) => v ? `${v}hrs` : '—', tgtFmt: (t: number) => `${t}hrs` },
                { label: 'Training Days', vals: [w0, w1, w2, w3].map(w => w.filter(l => l.training_done).length), tgt: null as number | null, fmt: (v: number) => `${v}/7`, tgtFmt: (_t: number) => '—' },
                { label: 'Days Logged', vals: [w0, w1, w2, w3].map(w => w.length), tgt: null as number | null, fmt: (v: number) => `${v}/7`, tgtFmt: (_t: number) => '—' },
              ] as const).map(row => (
                <tr key={row.label} className="border-b border-white/8">
                  <td className="py-2.5 text-grey-muted">{row.label}</td>
                  <td className={`py-2.5 font-medium ${pctColor(row.vals[0], row.tgt)}`}>
                    {row.fmt(row.vals[0])}{' '}
                    <span className={`text-xs ${trendColor(row.vals[0], row.vals[1])}`}>{trendArrow(row.vals[0], row.vals[1])}</span>
                  </td>
                  <td className="py-2.5 text-white/70">{row.fmt(row.vals[1])}</td>
                  <td className="py-2.5 text-white/70">{row.fmt(row.vals[2])}</td>
                  <td className="py-2.5 text-white/70">{row.fmt(row.vals[3])}</td>
                  {targets && <td className="py-2.5 text-grey-muted text-xs">{row.tgt ? row.tgtFmt(row.tgt) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
