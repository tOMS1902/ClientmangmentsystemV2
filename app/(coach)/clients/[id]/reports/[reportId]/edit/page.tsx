'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { DiagnosticReport, DiagnosticMarker, GeneticData, GeneticCategory } from '@/lib/types'
import { GeneticOverview, GeneticCategoryGrid, GeneticRecommendations, GeneticGroceryList, GeneticFollowupBloodwork } from '@/components/genetics'

// ─── Constants ────────────────────────────────────────────────────────────────
const S = '#0F1827'
const R = '#131929'
const B = '#1A2A40'
const TP = '#E8F0FC'
const TC = '#C8D4E8'
const TM = '#8A9AB8'
const TH = '#4A5A7A'
const GR = '#3ECF8E'
const AM = '#FBBF24'
const RD = '#F87171'
const GO = '#B89A5C'

const inputStyle = {
  backgroundColor: R, border: `1px solid ${B}`, borderRadius: 6,
  padding: '9px 12px', fontSize: 13, color: TP, outline: 'none',
  width: '100%', fontFamily: 'var(--font-body)',
}
const taStyle = { ...inputStyle, resize: 'vertical' as const, minHeight: 80 }
const labelStyle = {
  fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase' as const,
  letterSpacing: '0.06em', marginBottom: 4, display: 'block',
}

const STATUS_COLORS: Record<string, string> = {
  optimal: GR, 'borderline-low': AM, 'borderline-high': AM, low: RD, high: RD,
}
const STATUS_BG: Record<string, string> = {
  optimal: '#0A1E10', 'borderline-low': '#1E1808', 'borderline-high': '#1E1808', low: '#1E0C0C', high: '#1E0C0C',
}
const STATUS_BORDER: Record<string, string> = {
  optimal: '#1A4A2E', 'borderline-low': '#3D2E06', 'borderline-high': '#3D2E06', low: '#3D1616', high: '#3D1616',
}
// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ s }: { s: string }) {
  const labels: Record<string, string> = {
    optimal: 'OPTIMAL', 'borderline-low': 'BORDERLINE LOW', 'borderline-high': 'BORDERLINE HIGH', low: 'LOW', high: 'HIGH',
  }
  const c = STATUS_COLORS[s] || TM
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: c, backgroundColor: STATUS_BG[s] || R, border: `1px solid ${c}33`, borderRadius: 4, padding: '2px 7px' }}>
      {labels[s] || s}
    </span>
  )
}

function RangeBar({ value, low, high, unit, status }: { value: number; low: number; high: number; unit: string; status: string }) {
  if (low === high) return <div style={{ color: TH, fontSize: 11 }}>No range available</div>
  const pad = (high - low) * 0.3
  const barMin = low - pad, barMax = high + pad, range = barMax - barMin
  const dotPct = Math.min(100, Math.max(0, ((value - barMin) / range) * 100))
  const lowPct = Math.max(0, ((low - barMin) / range) * 100)
  const highPct = Math.min(100, ((high - barMin) / range) * 100)
  const midPct = Math.max(0, highPct - lowPct)
  const rightPct = Math.max(0, 100 - highPct)
  const dotColor = STATUS_COLORS[status] || TM
  return (
    <div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 4 }}>
        <div style={{ width: `${lowPct}%`, backgroundColor: '#3D1616' }} />
        <div style={{ width: `${midPct}%`, backgroundColor: '#1A4A2E' }} />
        <div style={{ width: `${rightPct}%`, backgroundColor: '#3D1616' }} />
        <div style={{ position: 'absolute', left: `calc(${dotPct}% - 6px)`, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}55`, zIndex: 2, border: '2px solid rgba(255,255,255,0.15)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TH }}>
        <span>{low}</span>
        <span style={{ color: GR }}>optimal {low}&ndash;{high} {unit}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

function HealthScoreRing({ score }: { score: number }) {
  const size = 90
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const color = score >= 80 ? GR : score >= 60 ? AM : RD
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={B} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={progress} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, color: TM, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EditReportPage() {
  const params = useParams<{ id: string; reportId: string }>()
  const router = useRouter()
  const { id: clientId, reportId } = params

  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [markers, setMarkers] = useState<DiagnosticMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [viewMode, setViewMode] = useState<'coach' | 'client'>('coach')
  const [editingTitle, setEditingTitle] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [geneticData, setGeneticData] = useState<GeneticData | null>(null)
  const [editingGenetics, setEditingGenetics] = useState(false)
  const [geneticDraft, setGeneticDraft] = useState<GeneticData | null>(null)

  // Suppress unused router warning — kept for potential programmatic navigation
  void router

  // Load report
  useEffect(() => {
    fetch(`/api/reports/${reportId}`)
      .then(r => r.json())
      .then((data: DiagnosticReport & { markers?: DiagnosticMarker[] }) => {
        setReport(data)
        setMarkers(data.markers || [])
        setLoading(false)
        setGeneticData(data.genetic_data ?? null)
        // Default: expand all categories
        const cats = new Set((data.markers || []).map((m: DiagnosticMarker) => m.category as string))
        setExpandedCategories(cats)
      })
      .catch(() => setLoading(false))
  }, [reportId])

  const patchReport = useCallback(async (updates: Partial<DiagnosticReport>) => {
    if (!report) return
    setReport(prev => prev ? { ...prev, ...updates } : prev)
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }, [report, reportId])

  const saveDraft = async () => {
    if (!report) return
    setSaving(true)
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_title: report.report_title,
        report_date: report.report_date,
        lab_source: report.lab_source,
        coach_summary: report.coach_summary,
        loom_url: report.loom_url,
        loom_description: report.loom_description,
        action_nutrition: report.action_nutrition,
        action_training: report.action_training,
        action_recovery: report.action_recovery,
        action_supplements: report.action_supplements,
        action_followup: report.action_followup,
      }),
    })
    setSaving(false)
    setSaveMsg('Saved')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const publish = async () => {
    if (!report) return
    if (!report.coach_summary && !confirmPublish) {
      setConfirmPublish(true)
      return
    }
    setConfirmPublish(false)
    await saveDraft()
    const res = await fetch(`/api/reports/${reportId}/publish`, { method: 'POST' })
    if (res.ok) setReport(prev => prev ? { ...prev, status: 'published' } : prev)
  }

  const unpublish = async () => {
    const res = await fetch(`/api/reports/${reportId}/unpublish`, { method: 'POST' })
    if (res.ok) setReport(prev => prev ? { ...prev, status: 'draft' } : prev)
  }

  const exportJSON = () => {
    if (!report) return
    const blob = new Blob(
      [JSON.stringify({ ...report, markers }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.report_title.replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateMarkerNote = async (markerId: string, note: string) => {
    setMarkers(prev => prev.map(m => m.id === markerId ? { ...m, coach_note: note } : m))
    await fetch(`/api/markers/${markerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_note: note }),
    })
    // Recalculate health_score from current markers state
    setMarkers(prev => {
      const total = prev.length
      const optimalCount = prev.filter(m => m.status === 'optimal').length
      const hs = total > 0 ? Math.round((optimalCount / total) * 100) : 0
      setReport(r => r && r.health_score !== hs ? { ...r, health_score: hs } : r)
      return prev
    })
  }

  const GENETIC_CATEGORIES: GeneticCategory[] = [
    'Macronutrient Metabolism',
    'Toxin Sensitivity',
    'Mental Health & Cognitive Performance',
    'Immune Support',
    'DNA Protection & Repair',
    'Methylation',
    'Hormone Support',
    'Cardiovascular Health & Athletic Performance',
  ]

  const saveGeneticData = async () => {
    if (!geneticDraft) return
    setSaving(true)
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genetic_data: geneticDraft }),
    })
    setGeneticData(geneticDraft)
    setEditingGenetics(false)
    setSaving(false)
    setSaveMsg('Saved')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  if (loading) return <div style={{ color: TM, padding: 40 }}>Loading report&hellip;</div>
  if (!report) return <div style={{ color: RD, padding: 40 }}>Report not found.</div>

  const flagged = markers.filter(m => m.is_flagged)
  const optimal = markers.filter(m => m.status === 'optimal')

  // Group markers by category
  const byCategory = markers.reduce((acc, m) => {
    const key = m.category as string
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {} as Record<string, DiagnosticMarker[]>)

  const isBloodwork = report.report_type === 'bloodwork'

  // Recommendation fields iterated in coach + client views
  const recFields: [keyof DiagnosticReport, string][] = [
    ['action_nutrition', 'Nutrition'],
    ['action_training', 'Training Adjustments'],
    ['action_recovery', 'Recovery & Sleep'],
    ['action_supplements', 'Supplements'],
  ]

  return (
    <div style={{ maxWidth: 900, padding: '0 24px 80px' }}>

      {/* ── Top nav bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link href={`/clients/${clientId}/reports`} style={{ fontSize: 12, color: TM, textDecoration: 'none' }}>
          &larr; Reports
        </Link>
        <div style={{ flex: 1 }}>
          {editingTitle ? (
            <input
              value={report.report_title}
              onChange={e => setReport(prev => prev ? { ...prev, report_title: e.target.value } : prev)}
              onBlur={() => { setEditingTitle(false); patchReport({ report_title: report.report_title }) }}
              autoFocus
              style={{ ...inputStyle, fontSize: 18, fontWeight: 700, width: 'auto', minWidth: 300 }}
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              style={{ fontSize: 20, fontWeight: 700, color: TP, cursor: 'text', display: 'inline', fontFamily: 'var(--font-display)' }}
            >
              {report.report_title}
            </h1>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Coach/Client view toggle */}
          <button
            onClick={() => setViewMode(v => v === 'coach' ? 'client' : 'coach')}
            style={{
              fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
              backgroundColor: viewMode === 'client' ? '#0A1E10' : R,
              color: viewMode === 'client' ? GR : TM,
              border: `1px solid ${viewMode === 'client' ? '#1A4A2E' : B}`,
            }}
          >
            {viewMode === 'coach' ? 'Client view' : 'Coach view'}
          </button>
          <button
            onClick={saveDraft}
            disabled={saving}
            style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: R, color: TM, border: `1px solid ${B}` }}
          >
            {saving ? '...' : saveMsg || 'Save draft'}
          </button>
          <button
            onClick={exportJSON}
            style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: R, color: TM, border: `1px solid ${B}` }}
          >
            Export JSON
          </button>
          {report.status === 'published' ? (
            <button
              onClick={unpublish}
              style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: '#1E1808', color: AM, border: '1px solid #3D2E06' }}
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={publish}
              style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: '#0A1E10', color: GR, border: '1px solid #1A4A2E' }}
            >
              Publish to client
            </button>
          )}
        </div>
      </div>

      {/* Publish confirmation warning */}
      {confirmPublish && (
        <div style={{ backgroundColor: '#1E1808', border: '1px solid #3D2E06', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: AM }}>You haven&apos;t added a coach summary. Publish anyway?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={publish} style={{ fontSize: 11, color: AM, background: 'none', border: '1px solid #3D2E06', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>Yes, publish</button>
            <button onClick={() => setConfirmPublish(false)} style={{ fontSize: 11, color: TM, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Report header ─────────────────────────────────── */}
      <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Report Date</label>
                {viewMode === 'coach' ? (
                  <input
                    type="date"
                    value={report.report_date}
                    onChange={e => setReport(prev => prev ? { ...prev, report_date: e.target.value } : prev)}
                    style={{ ...inputStyle, width: 'auto' }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: TC }}>
                    {new Date(report.report_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Lab Source</label>
                {viewMode === 'coach' ? (
                  <input
                    value={report.lab_source}
                    onChange={e => setReport(prev => prev ? { ...prev, lab_source: e.target.value } : prev)}
                    placeholder="e.g. The Health Lab / Randox"
                    style={{ ...inputStyle, width: 'auto' }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: TC }}>{report.lab_source || '—'}</div>
                )}
              </div>
              {report.status === 'published' && (
                <div style={{ fontSize: 11, fontWeight: 600, color: GR, backgroundColor: '#0A1E10', border: '1px solid #1A4A2E', borderRadius: 4, padding: '4px 10px', alignSelf: 'flex-end' }}>
                  PUBLISHED
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: TH }}>Coach-led interpretive tool &mdash; not a medical diagnostic.</div>
          </div>
          {isBloodwork ? (
            <HealthScoreRing score={report.health_score} />
          ) : (
            /* Genetics summary block */
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Categories', value: Object.keys(geneticData?.category_notes ?? {}).length, color: AM },
                { label: 'High Priority', value: Object.values(geneticData?.category_notes ?? {}).filter(n => n?.priority === 'high').length, color: RD },
                { label: 'Priorities', value: geneticData?.top_priorities.length ?? 0, color: GO },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: TM, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Coach Summary ──────────────────────────────────── */}
      <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <label style={labelStyle}>Coach Summary</label>
        {viewMode === 'coach' ? (
          <textarea
            value={report.coach_summary}
            onChange={e => setReport(prev => prev ? { ...prev, coach_summary: e.target.value } : prev)}
            placeholder="Add your overall summary for this client..."
            rows={4}
            style={taStyle}
          />
        ) : (
          report.coach_summary ? (
            <p style={{ fontSize: 13, color: TC, lineHeight: 1.7 }}>{report.coach_summary}</p>
          ) : (
            <div style={{ fontSize: 12, color: TH }}>No summary added yet.</div>
          )
        )}
      </div>

      {/* ── Summary cards (bloodwork) ──────────────────────── */}
      {isBloodwork && markers.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { title: "What's looking good", items: optimal.map(m => m.marker_name), color: GR, bg: '#0A1E10', border: '#1A4A2E', empty: 'No optimal markers yet' },
            { title: 'Needs attention', items: markers.filter(m => m.status.startsWith('borderline')).map(m => m.marker_name), color: AM, bg: '#1E1808', border: '#3D2E06', empty: 'None' },
            { title: 'Priority focus', items: markers.filter(m => m.status === 'low' || m.status === 'high').map(m => m.marker_name), color: RD, bg: '#1E0C0C', border: '#3D1616', empty: 'None' },
          ].map(card => (
            <div key={card.title} style={{ flex: 1, minWidth: 200, backgroundColor: card.bg, border: `1px solid ${card.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: card.color, marginBottom: 8 }}>{card.title}</div>
              {card.items.length === 0 ? (
                <div style={{ fontSize: 11, color: TH }}>{card.empty}</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {card.items.slice(0, 6).map(n => (
                    <span key={n} style={{ fontSize: 10, color: card.color, backgroundColor: `${card.color}18`, border: `1px solid ${card.color}33`, borderRadius: 4, padding: '2px 6px' }}>{n}</span>
                  ))}
                  {card.items.length > 6 && <span style={{ fontSize: 10, color: TH }}>+{card.items.length - 6} more</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Results of Interest (bloodwork) ───────────────── */}
      {isBloodwork && flagged.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Results of Interest</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {flagged.map(m => (
              <div key={m.id} style={{ backgroundColor: STATUS_BG[m.status] || S, border: `1px solid ${STATUS_BORDER[m.status] || B}`, borderLeft: `3px solid ${STATUS_COLORS[m.status] || B}`, borderRadius: 10, padding: '14px 16px' }}>
                <StatusBadge s={m.status} />
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: TP }}>{m.marker_name}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: TP }}>{m.value} <span style={{ fontSize: 12, color: TM }}>{m.unit}</span></div>
                {m.short_explanation && <p style={{ fontSize: 11, color: TC, marginTop: 6, lineHeight: 1.5 }}>{m.short_explanation}</p>}
                {viewMode === 'coach' && (
                  <textarea
                    defaultValue={m.coach_note}
                    onBlur={e => { if (e.target.value !== m.coach_note) updateMarkerNote(m.id, e.target.value) }}
                    placeholder="Add coach note..."
                    rows={2}
                    style={{ ...taStyle, marginTop: 8, minHeight: 50, fontSize: 11 }}
                  />
                )}
                {viewMode === 'client' && m.coach_note && (
                  <div style={{ borderLeft: `2px solid ${GO}`, paddingLeft: 8, fontSize: 11, color: TC, marginTop: 8, fontStyle: 'italic' }}>{m.coach_note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category breakdown (bloodwork) ────────────────── */}
      {isBloodwork && Object.keys(byCategory).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Category Breakdown</div>
          {Object.entries(byCategory).map(([cat, catMarkers]) => {
            const isExpanded = expandedCategories.has(cat)
            const catOptimal = catMarkers.filter(m => m.status === 'optimal').length
            const catFlagged = catMarkers.filter(m => m.is_flagged).length
            return (
              <div key={cat} style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedCategories(prev => {
                    const s = new Set(prev)
                    isExpanded ? s.delete(cat) : s.add(cat)
                    return s
                  })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TP }}>{cat}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: GR, backgroundColor: '#0A1E10', border: '1px solid #1A4A2E', borderRadius: 10, padding: '1px 7px' }}>{catOptimal} optimal</span>
                    {catFlagged > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: RD, backgroundColor: '#1E0C0C', border: '1px solid #3D1616', borderRadius: 10, padding: '1px 7px' }}>{catFlagged} flagged</span>
                    )}
                  </div>
                  <span style={{ color: TH, fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {catMarkers.map(m => (
                      <div key={m.id} style={{ borderTop: `1px solid ${B}`, paddingTop: 12, marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: TP }}>{m.marker_name}</div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: TP }}>{m.value} <span style={{ fontSize: 11, color: TM }}>{m.unit}</span></div>
                          </div>
                          <StatusBadge s={m.status} />
                        </div>
                        <RangeBar value={m.value} low={m.reference_range_low} high={m.reference_range_high} unit={m.unit} status={m.status} />
                        {m.short_explanation && <p style={{ fontSize: 11, color: TC, marginTop: 8, lineHeight: 1.5 }}>{m.short_explanation}</p>}
                        {viewMode === 'coach' && (
                          <textarea
                            defaultValue={m.coach_note}
                            onBlur={e => { if (e.target.value !== m.coach_note) updateMarkerNote(m.id, e.target.value) }}
                            placeholder="Add coach note..."
                            rows={2}
                            style={{ ...taStyle, marginTop: 8, minHeight: 48, fontSize: 11 }}
                          />
                        )}
                        {viewMode === 'client' && m.coach_note && (
                          <div style={{ borderLeft: `2px solid ${GO}`, paddingLeft: 8, fontSize: 11, color: TC, marginTop: 8, fontStyle: 'italic' }}>{m.coach_note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Genetics sections ──────────────────────────────── */}
      {!isBloodwork && (
        <div style={{ marginBottom: 24 }}>
          {/* Coach controls */}
          {viewMode === 'coach' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
              {editingGenetics ? (
                <>
                  <button
                    onClick={() => setEditingGenetics(false)}
                    style={{ fontSize: 11, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: R, color: TM, border: `1px solid ${B}` }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveGeneticData}
                    disabled={saving}
                    style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: '#0A1E10', color: GR, border: '1px solid #1A4A2E' }}
                  >
                    {saving ? '...' : 'Save genetics data'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setEditingGenetics(true); setGeneticDraft(geneticData ?? {
                    overview: '',
                    top_priorities: [],
                    category_notes: {},
                    recommendations: { nutrition: '', training: '', recovery: '', supplements: '' },
                    grocery_list: [],
                    followup_bloodwork: [],
                  }) }}
                  style={{ fontSize: 11, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', backgroundColor: R, color: TM, border: `1px solid ${B}` }}
                >
                  Edit genetics data
                </button>
              )}
            </div>
          )}

          {!geneticData && !editingGenetics ? (
            /* Empty state */
            <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: TM, marginBottom: 16 }}>No genetics data yet.</div>
              {viewMode === 'coach' && (
                <button
                  onClick={() => { setEditingGenetics(true); setGeneticDraft({ overview: '', top_priorities: [], category_notes: {}, recommendations: { nutrition: '', training: '', recovery: '', supplements: '' }, grocery_list: [], followup_bloodwork: [] }) }}
                  style={{ fontSize: 12, color: '#a78bfa', border: '1px solid #4c2a8a', backgroundColor: '#1a1040', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                >
                  Add genetics data
                </button>
              )}
            </div>
          ) : editingGenetics && geneticDraft ? (
            /* Edit form */
            <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Edit Genetics Data</div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Overview</label>
                <textarea
                  value={geneticDraft.overview}
                  onChange={e => setGeneticDraft(prev => prev ? { ...prev, overview: e.target.value } : prev)}
                  rows={3}
                  style={taStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Top Priorities <span style={{ color: TH, fontWeight: 400 }}>— one per line</span></label>
                <textarea
                  value={geneticDraft.top_priorities.join('\n')}
                  onChange={e => setGeneticDraft(prev => prev ? { ...prev, top_priorities: e.target.value.split('\n').filter(Boolean) } : prev)}
                  rows={4}
                  style={taStyle}
                />
              </div>

              <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Category Notes</div>
              {GENETIC_CATEGORIES.map(cat => (
                <div key={cat} style={{ backgroundColor: R, border: `1px solid ${B}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TP }}>{cat}</div>
                    <select
                      value={geneticDraft.category_notes[cat]?.priority ?? 'medium'}
                      onChange={e => setGeneticDraft(prev => {
                        if (!prev) return prev
                        return { ...prev, category_notes: { ...prev.category_notes, [cat]: { ...(prev.category_notes[cat] ?? { summary: '', key_findings: '', coaching_meaning: '' }), priority: e.target.value as 'high' | 'medium' | 'low' } } }
                      })}
                      style={{ fontSize: 11, backgroundColor: S, border: `1px solid ${B}`, color: TM, borderRadius: 4, padding: '3px 6px' }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {(['summary', 'key_findings', 'coaching_meaning'] as const).map(field => (
                      <div key={field}>
                        <label style={labelStyle}>{field.replace('_', ' ')}</label>
                        <textarea
                          value={geneticDraft.category_notes[cat]?.[field] ?? ''}
                          onChange={e => setGeneticDraft(prev => {
                            if (!prev) return prev
                            return { ...prev, category_notes: { ...prev.category_notes, [cat]: { ...(prev.category_notes[cat] ?? { summary: '', key_findings: '', coaching_meaning: '', priority: 'medium' as const }), [field]: e.target.value } } }
                          })}
                          rows={2}
                          style={{ ...taStyle, fontSize: 11, minHeight: 50 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 16 }}>Recommendations</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {(['nutrition', 'training', 'recovery', 'supplements'] as const).map(field => (
                  <div key={field}>
                    <label style={labelStyle}>{field === 'recovery' ? 'Recovery & Sleep' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <textarea
                      value={geneticDraft.recommendations[field]}
                      onChange={e => setGeneticDraft(prev => prev ? { ...prev, recommendations: { ...prev.recommendations, [field]: e.target.value } } : prev)}
                      rows={3}
                      style={taStyle}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Grocery List <span style={{ color: TH, fontWeight: 400 }}>— one per line</span></label>
                <textarea
                  value={geneticDraft.grocery_list.join('\n')}
                  onChange={e => setGeneticDraft(prev => prev ? { ...prev, grocery_list: e.target.value.split('\n').filter(Boolean) } : prev)}
                  rows={3}
                  style={taStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Bloodwork to Monitor <span style={{ color: TH, fontWeight: 400 }}>— one per line</span></label>
                <textarea
                  value={geneticDraft.followup_bloodwork.join('\n')}
                  onChange={e => setGeneticDraft(prev => prev ? { ...prev, followup_bloodwork: e.target.value.split('\n').filter(Boolean) } : prev)}
                  rows={3}
                  style={taStyle}
                />
              </div>
            </div>
          ) : geneticData ? (
            /* Visual display */
            <>
              <GeneticOverview overview={geneticData.overview} topPriorities={geneticData.top_priorities} />
              <GeneticCategoryGrid categoryNotes={geneticData.category_notes} />
              <GeneticRecommendations recommendations={geneticData.recommendations} />
              <GeneticGroceryList items={geneticData.grocery_list} />
              <GeneticFollowupBloodwork markers={geneticData.followup_bloodwork} />
            </>
          ) : null}
        </div>
      )}

      {/* ── Recommendations (coach view) ──────────────────── */}
      {viewMode === 'coach' && (
        <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Coach Recommendations</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {recFields.map(([field, label]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <textarea
                  value={String(report[field] ?? '')}
                  onChange={e => setReport(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
                  placeholder={`Add ${label.toLowerCase()} recommendations...`}
                  rows={3}
                  style={taStyle}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Follow-up Testing</label>
            <textarea
              value={report.action_followup}
              onChange={e => setReport(prev => prev ? { ...prev, action_followup: e.target.value } : prev)}
              placeholder="Notes on follow-up testing schedule..."
              rows={2}
              style={taStyle}
            />
          </div>
        </div>
      )}

      {/* ── Recommendations (client view) ─────────────────── */}
      {viewMode === 'client' && recFields.some(([field]) => Boolean(report[field])) && (
        <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Your Action Plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {recFields.map(([field, label]) =>
              report[field] ? (
                <div key={field} style={{ backgroundColor: R, border: `1px solid ${B}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: GO, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                  <p style={{ fontSize: 12, color: TC, lineHeight: 1.6, margin: 0 }}>{String(report[field])}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ── Loom section ──────────────────────────────────── */}
      <div style={{ backgroundColor: S, border: `1px solid ${B}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: TH, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Loom Walkthrough</div>
        {viewMode === 'coach' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Loom Video URL</label>
              <input
                value={report.loom_url}
                onChange={e => setReport(prev => prev ? { ...prev, loom_url: e.target.value } : prev)}
                placeholder="https://www.loom.com/share/..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Description for Client</label>
              <input
                value={report.loom_description}
                onChange={e => setReport(prev => prev ? { ...prev, loom_description: e.target.value } : prev)}
                placeholder="e.g. 12-min walkthrough of your results"
                style={inputStyle}
              />
            </div>
          </div>
        ) : (
          report.loom_url ? (
            <a
              href={report.loom_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: R, border: `1px solid ${B}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#E00000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>
                &#9654;
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TP }}>{report.loom_description || 'Watch video walkthrough'}</div>
                <div style={{ fontSize: 11, color: TM, marginTop: 2 }}>Click to open in Loom &rarr;</div>
              </div>
            </a>
          ) : (
            <div style={{ fontSize: 12, color: TH }}>No video added yet.</div>
          )
        )}
      </div>

      {/* PDF reference */}
      {report.pdf_file_url && (
        <div style={{ marginBottom: 20 }}>
          <a
            href={report.pdf_file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: GO, textDecoration: 'none' }}
          >
            View original report PDF &rarr;
          </a>
        </div>
      )}
    </div>
  )
}
