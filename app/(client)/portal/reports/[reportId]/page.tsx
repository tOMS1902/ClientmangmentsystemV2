import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { DiagnosticReport, DiagnosticMarker, DiagnosticInsight, InsightCategory } from '@/lib/types'

// ─── Design tokens ────────────────────────────────────────────────────────────
const S = '#0F1827'   // surface
const R = '#131929'   // raised
const B = '#1A2A40'   // border
const TP = '#E8F0FC'  // text primary
const TC = '#C8D4E8'  // text secondary
const TM = '#8A9AB8'  // text muted
const TH = '#4A5A7A'  // text hint
const GR = '#3ECF8E'  // green
const AM = '#FBBF24'  // amber
const RD = '#F87171'  // red
const GO = '#B89A5C'  // gold accent

const STATUS_COLORS: Record<string, string> = {
  optimal: GR,
  'borderline-low': AM,
  'borderline-high': AM,
  low: RD,
  high: RD,
}
const STATUS_BG: Record<string, string> = {
  optimal: '#0A1E10',
  'borderline-low': '#1E1808',
  'borderline-high': '#1E1808',
  low: '#1E0C0C',
  high: '#1E0C0C',
}
const STATUS_BORDER: Record<string, string> = {
  optimal: '#1A4A2E',
  'borderline-low': '#3D2E06',
  'borderline-high': '#3D2E06',
  low: '#3D1616',
  high: '#3D1616',
}
const STATUS_LABEL: Record<string, string> = {
  optimal: 'OPTIMAL',
  'borderline-low': 'BORDERLINE LOW',
  'borderline-high': 'BORDERLINE HIGH',
  low: 'LOW',
  high: 'HIGH',
}

const PRIORITY_COLORS: Record<string, string> = { high: RD, medium: AM, low: GR }
const PRIORITY_BG: Record<string, string> = { high: '#1E0C0C', medium: '#1E1808', low: '#0A1E10' }
const PRIORITY_BORDER: Record<string, string> = { high: '#3D1616', medium: '#3D2E06', low: '#1A4A2E' }

const CATEGORY_ORDER: InsightCategory[] = [
  'priority-focus',
  'key-risks',
  'nutrition',
  'training',
  'recovery',
  'general',
]
const CATEGORY_LABELS: Record<InsightCategory, string> = {
  'priority-focus': 'Priority Focus',
  'key-risks': 'Key Risks',
  nutrition: 'Nutrition',
  training: 'Training',
  recovery: 'Recovery',
  general: 'General Insights',
}

// ─── Range bar ────────────────────────────────────────────────────────────────
function RangeBar({
  value,
  low,
  high,
  unit,
  status,
}: {
  value: number
  low: number
  high: number
  unit: string
  status: string
}) {
  if (low === high) {
    return <div style={{ color: TH, fontSize: 11 }}>No range available</div>
  }
  const pad = (high - low) * 0.3
  const barMin = low - pad
  const barMax = high + pad
  const range = barMax - barMin
  const dotPct = Math.min(100, Math.max(0, ((value - barMin) / range) * 100))
  const lowPct = Math.max(0, ((low - barMin) / range) * 100)
  const highPct = Math.min(100, ((high - barMin) / range) * 100)
  const midPct = Math.max(0, highPct - lowPct)
  const rightPct = Math.max(0, 100 - highPct)
  const dotColor = STATUS_COLORS[status] || TM

  return (
    <div>
      <div
        style={{
          position: 'relative',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          marginBottom: 4,
        }}
      >
        <div style={{ width: `${lowPct}%`, backgroundColor: '#3D1616', flexShrink: 0 }} />
        <div style={{ width: `${midPct}%`, backgroundColor: '#1A4A2E', flexShrink: 0 }} />
        <div style={{ width: `${rightPct}%`, backgroundColor: '#3D1616', flexShrink: 0 }} />
        <div
          style={{
            position: 'absolute',
            left: `calc(${dotPct}% - 6px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}55`,
            zIndex: 2,
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: TH,
        }}
      >
        <span>{low}</span>
        <span style={{ color: GR }}>
          optimal {low}–{high} {unit}
        </span>
        <span>{high}</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || TM
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: c,
        backgroundColor: STATUS_BG[status] || R,
        border: `1px solid ${c}33`,
        borderRadius: 4,
        padding: '2px 7px',
      }}
    >
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function HealthScoreRing({ score }: { score: number }) {
  const size = 100
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const color = score >= 80 ? GR : score >= 60 ? AM : RD

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', position: 'absolute' }}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={B} strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div
          style={{
            fontSize: 9,
            color: TM,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: 2,
          }}
        >
          Score
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ClientReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>
}) {
  const { reportId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch report — only published reports are visible to clients
  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('*')
    .eq('id', reportId)
    .eq('status', 'published')
    .single<DiagnosticReport>()

  if (!report) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: TM }}>Report not found or not yet published.</div>
      </div>
    )
  }

  // Verify this report belongs to the logged-in client
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('id', report.client_id)
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: TM }}>Report not found.</div>
      </div>
    )
  }

  // Fetch markers and insights in parallel
  const [{ data: markersData }, { data: insightsData }] = await Promise.all([
    supabase
      .from('diagnostic_markers')
      .select('*')
      .eq('report_id', reportId)
      .order('display_order'),
    supabase
      .from('diagnostic_insights')
      .select('*')
      .eq('report_id', reportId)
      .order('display_order'),
  ])

  const markers = (markersData as DiagnosticMarker[] | null) ?? []
  const insights = (insightsData as DiagnosticInsight[] | null) ?? []

  const isBloodwork = report.report_type === 'bloodwork'
  const flagged = markers.filter(m => m.is_flagged)

  // Group markers by category
  const byCategory = markers.reduce<Record<string, DiagnosticMarker[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  // Group insights by category
  const byInsightCat = insights.reduce<Record<string, DiagnosticInsight[]>>((acc, ins) => {
    if (!acc[ins.category]) acc[ins.category] = []
    acc[ins.category].push(ins)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div
          className="eyebrow"
          style={{ marginBottom: 8 }}
        >
          The Legal Edge
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: TP,
            fontFamily: 'var(--font-display)',
            marginBottom: 6,
          }}
        >
          Your Health Diagnostics
        </h1>
        <div style={{ fontSize: 12, color: TM }}>
          Report prepared by Calum Fraser &middot;{' '}
          {new Date(report.report_date).toLocaleDateString('en-IE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* ── Metric summary cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {isBloodwork ? (
          <>
            <div style={{ flex: '0 0 auto' }}>
              <HealthScoreRing score={report.health_score} />
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                {
                  label: 'Optimal Markers',
                  value: markers.filter(m => m.status === 'optimal').length,
                  color: GR,
                },
                {
                  label: 'To Address',
                  value: flagged.length,
                  color: flagged.length > 0 ? RD : GR,
                },
                { label: 'Total Markers', value: markers.length, color: TM },
              ].map(card => (
                <div
                  key={card.label}
                  style={{
                    backgroundColor: S,
                    border: `1px solid ${B}`,
                    borderRadius: 10,
                    padding: '14px 18px',
                    flex: 1,
                    minWidth: 120,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
                    {card.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: TM,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginTop: 2,
                    }}
                  >
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Genetics 3-metric block */
          <>
            {[
              { label: 'Total Insights', value: insights.length, color: GO },
              {
                label: 'High Priority',
                value: insights.filter(i => i.priority === 'high').length,
                color: RD,
              },
              {
                label: 'Categories',
                value: new Set(insights.map(i => i.category)).size,
                color: AM,
              },
            ].map(card => (
              <div
                key={card.label}
                style={{
                  backgroundColor: S,
                  border: `1px solid ${B}`,
                  borderRadius: 10,
                  padding: '20px 24px',
                  flex: 1,
                  minWidth: 140,
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: TM,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginTop: 4,
                  }}
                >
                  {card.label}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Loom card ─────────────────────────────────────────────────────────── */}
      {report.loom_url && (
        <a
          href={report.loom_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: S,
            border: `1px solid ${GO}33`,
            borderRadius: 12,
            padding: '16px 20px',
            textDecoration: 'none',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#E00000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            &#9654;
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TP }}>
              {report.loom_description || 'Watch your personalised video walkthrough'}
            </div>
            <div style={{ fontSize: 11, color: TM, marginTop: 2 }}>Click to open in Loom →</div>
          </div>
        </a>
      )}

      {/* ── From your coach ───────────────────────────────────────────────────── */}
      {report.coach_summary && (
        <div
          style={{
            backgroundColor: S,
            border: `1px solid ${B}`,
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: GO,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 10,
            }}
          >
            From Your Coach
          </div>
          <p style={{ fontSize: 13, color: TC, lineHeight: 1.8, margin: 0 }}>
            {report.coach_summary}
          </p>
        </div>
      )}

      {/* ── Flagged markers (bloodwork only) ─────────────────────────────────── */}
      {isBloodwork && flagged.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TH,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
            }}
          >
            Results of Interest
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {flagged.map(m => (
              <div
                key={m.id}
                style={{
                  backgroundColor: STATUS_BG[m.status],
                  border: `1px solid ${STATUS_BORDER[m.status]}`,
                  borderLeft: `3px solid ${STATUS_COLORS[m.status]}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                }}
              >
                <StatusBadge status={m.status} />
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: TP }}>
                  {m.marker_name}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: TP, marginTop: 2 }}>
                  {m.value}{' '}
                  <span style={{ fontSize: 12, fontWeight: 400, color: TM }}>{m.unit}</span>
                </div>
                {m.short_explanation && (
                  <p style={{ fontSize: 11, color: TC, marginTop: 8, lineHeight: 1.5 }}>
                    {m.short_explanation}
                  </p>
                )}
                {m.coach_note && (
                  <div
                    style={{
                      borderLeft: `2px solid ${GO}`,
                      paddingLeft: 8,
                      fontSize: 11,
                      color: TC,
                      marginTop: 8,
                      fontStyle: 'italic',
                    }}
                  >
                    {m.coach_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category breakdown (bloodwork only) ──────────────────────────────── */}
      {isBloodwork && Object.keys(byCategory).length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TH,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
            }}
          >
            Full Results Breakdown
          </div>
          {Object.entries(byCategory).map(([cat, catMarkers]) => (
            <details
              key={cat}
              style={{
                backgroundColor: S,
                border: `1px solid ${B}`,
                borderRadius: 10,
                marginBottom: 8,
                overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  listStyle: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: TP,
                }}
              >
                {cat}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: GR,
                    backgroundColor: '#0A1E10',
                    border: '1px solid #1A4A2E',
                    borderRadius: 10,
                    padding: '1px 7px',
                  }}
                >
                  {catMarkers.filter(m => m.status === 'optimal').length} optimal
                </span>
                {catMarkers.filter(m => m.is_flagged).length > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: RD,
                      backgroundColor: '#1E0C0C',
                      border: '1px solid #3D1616',
                      borderRadius: 10,
                      padding: '1px 7px',
                    }}
                  >
                    {catMarkers.filter(m => m.is_flagged).length} flagged
                  </span>
                )}
              </summary>
              <div style={{ padding: '0 16px 16px' }}>
                {catMarkers.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      borderTop: i === 0 ? `1px solid ${B}` : `1px solid ${B}20`,
                      paddingTop: 12,
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TP }}>
                          {m.marker_name}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: TP, marginTop: 2 }}>
                          {m.value}{' '}
                          <span style={{ fontSize: 11, fontWeight: 400, color: TM }}>{m.unit}</span>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <RangeBar
                      value={m.value}
                      low={m.reference_range_low}
                      high={m.reference_range_high}
                      unit={m.unit}
                      status={m.status}
                    />
                    {m.short_explanation && (
                      <p style={{ fontSize: 11, color: TC, marginTop: 8, lineHeight: 1.5 }}>
                        {m.short_explanation}
                      </p>
                    )}
                    {m.coach_note && (
                      <div
                        style={{
                          borderLeft: `2px solid ${GO}`,
                          paddingLeft: 8,
                          fontSize: 11,
                          color: TC,
                          marginTop: 8,
                          fontStyle: 'italic',
                        }}
                      >
                        {m.coach_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* ── Insight sections (genetics only) ─────────────────────────────────── */}
      {!isBloodwork && insights.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          {CATEGORY_ORDER.filter(cat => byInsightCat[cat]?.length).map(cat => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: TH,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </div>
              {byInsightCat[cat].map(ins => (
                <div
                  key={ins.id}
                  style={{
                    backgroundColor: PRIORITY_BG[ins.priority],
                    border: `1px solid ${PRIORITY_BORDER[ins.priority]}`,
                    borderLeft: `3px solid ${PRIORITY_COLORS[ins.priority]}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: PRIORITY_COLORS[ins.priority],
                      backgroundColor: PRIORITY_BG[ins.priority],
                      border: `1px solid ${PRIORITY_COLORS[ins.priority]}33`,
                      borderRadius: 4,
                      padding: '2px 7px',
                    }}
                  >
                    {ins.priority.toUpperCase()}
                  </span>
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: TP }}>
                    {ins.title}
                  </div>
                  <p style={{ fontSize: 12, color: TC, lineHeight: 1.7, marginTop: 6 }}>
                    {ins.description}
                  </p>
                  {ins.coach_note && (
                    <div
                      style={{
                        borderLeft: `2px solid ${GO}`,
                        paddingLeft: 10,
                        fontSize: 11,
                        color: TC,
                        marginTop: 10,
                        fontStyle: 'italic',
                      }}
                    >
                      {ins.coach_note}
                    </div>
                  )}
                  {ins.recommendation && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        backgroundColor: R,
                        borderRadius: 6,
                        fontSize: 12,
                        color: TC,
                      }}
                    >
                      <strong style={{ color: GO }}>Action: </strong>
                      {ins.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Action plan ───────────────────────────────────────────────────────── */}
      {(report.action_nutrition ||
        report.action_training ||
        report.action_recovery ||
        report.action_supplements) && (
        <div
          style={{
            backgroundColor: S,
            border: `1px solid ${B}`,
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: GO,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            Your Action Plan
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {(
              [
                ['action_nutrition', 'Nutrition'],
                ['action_training', 'Training Adjustments'],
                ['action_recovery', 'Recovery & Sleep'],
                ['action_supplements', 'Supplements'],
              ] as [keyof DiagnosticReport, string][]
            ).map(([field, label]) =>
              report[field] ? (
                <div
                  key={field}
                  style={{
                    backgroundColor: R,
                    border: `1px solid ${B}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: GO,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </div>
                  <p style={{ fontSize: 12, color: TC, lineHeight: 1.6, margin: 0 }}>
                    {String(report[field])}
                  </p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ── Disclaimer ────────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 10, color: TH, textAlign: 'center', marginTop: 40 }}>
        Coach-led interpretive tool — not a medical diagnostic. Always consult a qualified
        healthcare professional for medical advice.
      </div>
    </div>
  )
}
