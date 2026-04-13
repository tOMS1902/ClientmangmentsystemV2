'use client'
import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { ParsedMarkerInput, DiagnosticReportType } from '@/lib/types'
import { parseJSON, parseCSV } from '@/lib/diagnostics/parser'

// Inline styles constants
const SURFACE = '#0F1827'
const RAISED = '#131929'
const BORDER = '#1A2A40'
const TEXT_PRIMARY = '#E8F0FC'
const TEXT_MUTED = '#8A9AB8'
const TEXT_HINT = '#4A5A7A'
const GREEN = '#3ECF8E'
const RED = '#F87171'
const GOLD = '#B89A5C'

const inputStyle = {
  backgroundColor: RAISED,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: '9px 12px',
  fontSize: 13,
  color: TEXT_PRIMARY,
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-body)',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: TEXT_MUTED,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 4,
  display: 'block',
}

interface ManualRow {
  marker_name: string
  value: string
  unit: string
  reference_range_low: string
  reference_range_high: string
  error?: string
}

function emptyRow(): ManualRow {
  return { marker_name: '', value: '', unit: '', reference_range_low: '', reference_range_high: '' }
}

export default function NewReportPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const clientId = params.id

  // Report metadata
  const [reportType, setReportType] = useState<DiagnosticReportType>('bloodwork')
  const [reportTitle, setReportTitle] = useState('Blood Diagnostics Report')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [labSource, setLabSource] = useState('')

  // Tabs
  const [activeTab, setActiveTab] = useState(0)

  // JSON/CSV paste
  const [jsonText, setJsonText] = useState('')
  const [csvText, setCsvText] = useState('')
  const [parseError, setParseError] = useState('')

  // AI prompt tab
  const [promptStep, setPromptStep] = useState<'prompt' | 'paste'>('prompt')
  const [promptCopied, setPromptCopied] = useState(false)
  const [aiPasteText, setAiPasteText] = useState('')

  // JSON file upload
  const jsonFileRef = useRef<HTMLInputElement>(null)

  function handleJSONFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      setJsonText(e.target?.result as string ?? '')
      setParseError('')
    }
    reader.readAsText(file)
  }

  const AI_PROMPT = `You are a medical data extraction assistant. I will give you a blood test / lab results PDF. Extract every biomarker listed.

Return ONLY a raw JSON array — no explanation, no markdown, no backticks. Start with [ and end with ].

Each object must have exactly these fields:
{
  "marker_name": "full name as printed (e.g. Haemoglobin, TSH, Ferritin)",
  "value": number,
  "unit": "unit of measurement, empty string if none",
  "reference_range_low": number,
  "reference_range_high": number,
  "category": "one of: Full Blood Count | Iron Status | Heart Health | Diabetes Health | Metabolic Syndrome | Kidney Health | Liver Health | Nutritional Health | Muscle & Joint Health | Bone Health | Infection & Inflammation | Pituitary & Adrenal Health | Thyroid Health | Stress Health | Hormonal Health"
}

Rules:
- value, reference_range_low, reference_range_high must all be numbers
- If range is "< 5.0" use reference_range_low: 0, reference_range_high: 5.0
- If range is "> 60" use reference_range_low: 60, reference_range_high: 9999
- Skip rows where you cannot determine a numeric value or range
- Do not invent or estimate — only extract what is printed
- If no markers found return []

Here is the blood test report:`

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(AI_PROMPT)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2500)
  }

  function handleParseAIPaste() {
    setParseError('')
    setParseWarning('')
    const result = parseJSON(aiPasteText)
    if (!result.success && !result.markers) { setParseError(result.error ?? 'Parse error'); return }
    handleParsedMarkers(result.markers!, result.error ?? undefined)
  }

  // Manual rows
  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyRow(), emptyRow()])

  // Preview state
  const [preview, setPreview] = useState<ParsedMarkerInput[] | null>(null)
  const [editablePreview, setEditablePreview] = useState<ParsedMarkerInput[]>([])

  // Genetics insights
  const [insightRows, setInsightRows] = useState<{ title: string; description: string; category: string; priority: string }[]>([
    { title: '', description: '', category: 'general', priority: 'medium' },
  ])

  // Loading / error
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [parseWarning, setParseWarning] = useState('')

  const bloodworkTabs = ['AI Prompt', 'Paste JSON', 'Paste CSV', 'Manual Entry']
  const geneticsTabs = ['AI Prompt', 'Manual Insights']

  const tabs = reportType === 'genetics' ? geneticsTabs : bloodworkTabs

  function handleParsedMarkers(markers: ParsedMarkerInput[], warning?: string) {
    setPreview(markers)
    setEditablePreview(markers)
    setParseError('')
    setParseWarning(warning ?? '')
    setActiveTab(-1) // signal "showing preview"
  }

  function handleParseJSON() {
    setParseError('')
    setParseWarning('')
    const result = parseJSON(jsonText)
    if (!result.success && !result.markers) { setParseError(result.error ?? 'Parse error'); return }
    handleParsedMarkers(result.markers!, result.error ?? undefined)
  }

  function handleParseCSV() {
    setParseError('')
    setParseWarning('')
    const result = parseCSV(csvText)
    if (!result.success) { setParseError(result.error ?? 'Parse error'); return }
    handleParsedMarkers(result.markers!)
  }

  function handleManualSubmit() {
    setParseError('')
    const errors: string[] = []
    const parsed: ParsedMarkerInput[] = []
    manualRows.forEach((row, i) => {
      const name = row.marker_name.trim()
      const val = parseFloat(row.value)
      const low = parseFloat(row.reference_range_low)
      const high = parseFloat(row.reference_range_high)
      if (!name) { errors.push(`Row ${i + 1}: marker name required`); return }
      if (isNaN(val)) { errors.push(`Row ${i + 1}: value must be a number`); return }
      if (isNaN(low)) { errors.push(`Row ${i + 1}: range low must be a number`); return }
      if (isNaN(high)) { errors.push(`Row ${i + 1}: range high must be a number`); return }
      parsed.push({ marker_name: name, value: val, unit: row.unit, reference_range_low: low, reference_range_high: high })
    })
    if (errors.length > 0) { setParseError(errors.join(' | ')); return }
    if (parsed.length === 0) { setParseError('No markers entered'); return }
    handleParsedMarkers(parsed)
  }

  async function handleConfirmBloodwork() {
    if (!editablePreview.length) return
    setSaving(true)
    setError('')
    try {
      // 1. Create report
      const reportRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          report_type: reportType,
          report_title: reportTitle,
          report_date: reportDate,
          lab_source: labSource,
        }),
      })
      if (!reportRes.ok) {
        const d = await reportRes.json()
        throw new Error(d.error || 'Failed to create report')
      }
      const report = await reportRes.json()

      // 2. Bulk insert markers
      const markersRes = await fetch(`/api/reports/${report.id}/markers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markers: editablePreview }),
      })
      if (!markersRes.ok) {
        const d = await markersRes.json()
        throw new Error(d.error || 'Failed to save markers')
      }

      router.push(`/clients/${clientId}/reports/${report.id}/edit`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmGenetics() {
    setSaving(true)
    setError('')
    try {
      const reportRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          report_type: 'genetics',
          report_title: reportTitle,
          report_date: reportDate,
          lab_source: labSource,
        }),
      })
      if (!reportRes.ok) {
        const d = await reportRes.json()
        throw new Error(d.error || 'Failed to create report')
      }
      const report = await reportRes.json()

      const validInsights = insightRows.filter(r => r.title.trim() && r.description.trim())
      if (validInsights.length > 0) {
        await fetch(`/api/reports/${report.id}/insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insights: validInsights }),
        })
      }

      router.push(`/clients/${clientId}/reports/${report.id}/edit`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const showingPreview = preview !== null && activeTab === -1

  return (
    <div style={{ maxWidth: 860, padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <a href={`/clients/${clientId}/reports`} style={{ fontSize: 12, color: TEXT_MUTED, textDecoration: 'none' }}>← Reports</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT_PRIMARY, marginTop: 8, fontFamily: 'var(--font-display)' }}>
          New Diagnostic Report
        </h1>
      </div>

      {/* Metadata */}
      <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Report Details
        </div>

        {/* Report type selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Report Type</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['bloodwork', 'genetics'] as DiagnosticReportType[]).map(t => (
              <button
                key={t}
                onClick={() => {
                  setReportType(t)
                  setActiveTab(0)
                  setPreview(null)
                  setReportTitle(t === 'genetics' ? 'Genetics Report' : 'Blood Diagnostics Report')
                }}
                style={{
                  padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  backgroundColor: reportType === t ? (t === 'genetics' ? '#1a1040' : '#0A1E10') : RAISED,
                  color: reportType === t ? (t === 'genetics' ? '#a78bfa' : GREEN) : TEXT_MUTED,
                  border: `1px solid ${reportType === t ? (t === 'genetics' ? '#4c2a8a' : '#1A4A2E') : BORDER}`,
                }}
              >
                {t === 'bloodwork' ? '🩸 Bloodwork' : '🧬 Genetics'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Report Title</label>
            <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Report Date</label>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Lab Source</label>
            <input
              value={labSource}
              onChange={e => setLabSource(e.target.value)}
              placeholder="e.g. The Health Lab / Randox"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Tab area */}
      {!showingPreview && (
        <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Tab headers */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: '12px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'none', border: 'none',
                  color: activeTab === i ? TEXT_PRIMARY : TEXT_MUTED,
                  borderBottom: activeTab === i ? `2px solid ${GOLD}` : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {/* AI Prompt tab */}
            {activeTab === 0 && (
              <div>
                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span
                    onClick={() => setPromptStep('prompt')}
                    style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer',
                      color: promptStep === 'prompt' ? GOLD : TEXT_HINT,
                      fontFamily: 'var(--font-label)', textTransform: 'uppercase' }}
                  >
                    1. COPY PROMPT
                  </span>
                  <span style={{ color: TEXT_HINT, fontSize: 11 }}>→</span>
                  <span
                    onClick={() => setPromptStep('paste')}
                    style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer',
                      color: promptStep === 'paste' ? GOLD : TEXT_HINT,
                      fontFamily: 'var(--font-label)', textTransform: 'uppercase' }}
                  >
                    2. PASTE RESPONSE
                  </span>
                </div>

                {promptStep === 'prompt' ? (
                  <>
                    <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 14, lineHeight: 1.6 }}>
                      Upload the blood test PDF to <strong style={{ color: TEXT_PRIMARY }}>ChatGPT, Claude.ai, or any AI</strong>, then copy and paste this prompt. The AI will extract all markers into the exact format needed.
                    </p>
                    <pre style={{
                      backgroundColor: RAISED, border: `1px solid ${BORDER}`, borderRadius: 8,
                      padding: '14px 16px', fontSize: 11, color: TEXT_PRIMARY, fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 220, overflowY: 'auto', marginBottom: 14,
                    }}>
                      {AI_PROMPT}
                    </pre>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={handleCopyPrompt}
                        style={{
                          backgroundColor: promptCopied ? '#0A1E10' : GREEN,
                          color: promptCopied ? GREEN : '#0A1E10',
                          border: promptCopied ? `1px solid ${GREEN}` : 'none',
                          borderRadius: 6, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        {promptCopied ? '✓ Copied!' : '📋 Copy Prompt'}
                      </button>
                      <button
                        onClick={() => setPromptStep('paste')}
                        style={{
                          backgroundColor: RAISED, border: `1px solid ${BORDER}`,
                          color: TEXT_MUTED, borderRadius: 6, padding: '10px 18px', fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Next: Paste Response →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 14 }}>
                      Paste the AI&apos;s JSON response below. It will be parsed into the marker preview.
                    </p>
                    <textarea
                      value={aiPasteText}
                      onChange={e => setAiPasteText(e.target.value)}
                      placeholder={'[\n  {"marker_name":"Ferritin","value":42,"unit":"µg/L","reference_range_low":13,"reference_range_high":150,"category":"Iron Status"},\n  ...\n]'}
                      rows={12}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, marginBottom: 10 }}
                      autoFocus
                    />
                    {parseError && <div style={{ color: RED, fontSize: 12, marginBottom: 10 }}>{parseError}</div>}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={handleParseAIPaste}
                        disabled={!aiPasteText.trim()}
                        style={{
                          backgroundColor: GREEN, color: '#0A1E10', fontWeight: 700,
                          fontSize: 12, padding: '10px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        }}
                      >
                        Parse & Preview →
                      </button>
                      <button
                        onClick={() => setPromptStep('prompt')}
                        style={{
                          backgroundColor: 'transparent', border: `1px solid ${BORDER}`,
                          color: TEXT_MUTED, borderRadius: 6, padding: '10px 14px', fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        ← Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* JSON tab (bloodwork only, tab index 1) */}
            {reportType === 'bloodwork' && activeTab === 1 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: TEXT_HINT, fontFamily: 'monospace' }}>
                    {`Expected format: [{"marker_name":"Cortisol","value":28.4,"unit":"nmol/L","reference_range_low":6.2,"reference_range_high":19.4}, ...]`}
                  </div>
                  <button
                    onClick={() => jsonFileRef.current?.click()}
                    style={{
                      flexShrink: 0, marginLeft: 12, backgroundColor: RAISED, border: `1px solid ${BORDER}`,
                      color: TEXT_MUTED, borderRadius: 6, padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    📂 Upload .json
                  </button>
                  <input
                    ref={jsonFileRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleJSONFileUpload(f) }}
                  />
                </div>
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder="Paste JSON array here, or upload a .json file above…"
                  rows={12}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                />
                {parseError && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{parseError}</div>}
                <button
                  onClick={handleParseJSON}
                  disabled={!jsonText.trim()}
                  style={{
                    marginTop: 12, backgroundColor: GREEN, color: '#0A1E10', fontWeight: 600,
                    fontSize: 12, padding: '10px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  }}
                >
                  Parse JSON →
                </button>
              </div>
            )}

            {/* CSV tab (bloodwork only, tab index 2) */}
            {reportType === 'bloodwork' && activeTab === 2 && (
              <div>
                <div style={{ fontSize: 11, color: TEXT_HINT, marginBottom: 10, fontFamily: 'monospace' }}>
                  Required columns: marker_name, value, unit, reference_range_low, reference_range_high
                </div>
                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder={'marker_name,value,unit,reference_range_low,reference_range_high\nCortisol,28.4,nmol/L,6.2,19.4'}
                  rows={12}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                />
                {parseError && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{parseError}</div>}
                <button
                  onClick={handleParseCSV}
                  disabled={!csvText.trim()}
                  style={{
                    marginTop: 12, backgroundColor: GREEN, color: '#0A1E10', fontWeight: 600,
                    fontSize: 12, padding: '10px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  }}
                >
                  Parse CSV →
                </button>
              </div>
            )}

            {/* Manual entry tab (bloodwork tab 3, genetics tab 1) */}
            {((reportType === 'bloodwork' && activeTab === 3) || (reportType === 'genetics' && activeTab === 1)) && (
              reportType === 'bloodwork' ? (
                <div>
                  {/* Manual marker rows */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: 8, marginBottom: 8 }}>
                    {['Marker Name', 'Value', 'Unit', 'Range Low', 'Range High', ''].map(h => (
                      <div key={h} style={{ fontSize: 10, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {manualRows.map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: 8, marginBottom: 6 }}>
                      <input
                        value={row.marker_name}
                        onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], marker_name: e.target.value }; setManualRows(r) }}
                        placeholder="e.g. Cortisol"
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      />
                      <input
                        value={row.value}
                        onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], value: e.target.value }; setManualRows(r) }}
                        placeholder="28.4"
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      />
                      <input
                        value={row.unit}
                        onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], unit: e.target.value }; setManualRows(r) }}
                        placeholder="nmol/L"
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      />
                      <input
                        value={row.reference_range_low}
                        onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], reference_range_low: e.target.value }; setManualRows(r) }}
                        placeholder="6.2"
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      />
                      <input
                        value={row.reference_range_high}
                        onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], reference_range_high: e.target.value }; setManualRows(r) }}
                        placeholder="19.4"
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      />
                      <button
                        onClick={() => setManualRows(r => r.filter((_, j) => j !== i))}
                        style={{ backgroundColor: 'transparent', border: '1px solid #3D1616', color: RED, borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {parseError && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{parseError}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => setManualRows(r => [...r, emptyRow()])}
                      style={{ backgroundColor: RAISED, border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
                    >
                      + Add Row
                    </button>
                    <button
                      onClick={handleManualSubmit}
                      style={{ backgroundColor: GREEN, color: '#0A1E10', fontWeight: 600, fontSize: 12, padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
                    >
                      Preview Markers →
                    </button>
                  </div>
                </div>
              ) : (
                /* Genetics manual insights */
                <div>
                  {insightRows.map((row, i) => (
                    <div
                      key={i}
                      style={{ backgroundColor: RAISED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 30px', gap: 10, marginBottom: 8 }}>
                        <input
                          value={row.title}
                          onChange={e => { const r = [...insightRows]; r[i] = { ...r[i], title: e.target.value }; setInsightRows(r) }}
                          placeholder="Insight title (max 80 chars)"
                          maxLength={80}
                          style={{ ...inputStyle, padding: '7px 10px' }}
                        />
                        <select
                          value={row.category}
                          onChange={e => { const r = [...insightRows]; r[i] = { ...r[i], category: e.target.value }; setInsightRows(r) }}
                          style={{ ...inputStyle, padding: '7px 10px' }}
                        >
                          <option value="priority-focus">Priority Focus</option>
                          <option value="key-risks">Key Risks</option>
                          <option value="nutrition">Nutrition</option>
                          <option value="training">Training</option>
                          <option value="recovery">Recovery</option>
                          <option value="general">General</option>
                        </select>
                        <select
                          value={row.priority}
                          onChange={e => { const r = [...insightRows]; r[i] = { ...r[i], priority: e.target.value }; setInsightRows(r) }}
                          style={{ ...inputStyle, padding: '7px 10px' }}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <button
                          onClick={() => setInsightRows(r => r.filter((_, j) => j !== i))}
                          style={{ backgroundColor: 'transparent', border: '1px solid #3D1616', color: RED, borderRadius: 4, cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        value={row.description}
                        onChange={e => { const r = [...insightRows]; r[i] = { ...r[i], description: e.target.value }; setInsightRows(r) }}
                        placeholder="2–4 sentence plain-English description…"
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setInsightRows(r => [...r, { title: '', description: '', category: 'general', priority: 'medium' }])}
                    style={{
                      backgroundColor: RAISED, border: `1px solid ${BORDER}`, color: TEXT_MUTED,
                      borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', marginRight: 10,
                    }}
                  >
                    + Add Insight
                  </button>
                  {error && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{error}</div>}
                  <button
                    onClick={handleConfirmGenetics}
                    disabled={saving}
                    style={{
                      backgroundColor: '#1a1040', color: '#a78bfa', border: '1px solid #4c2a8a',
                      borderRadius: 6, padding: '10px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12,
                    }}
                  >
                    {saving ? 'Creating…' : 'Create Report →'}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Preview table (bloodwork) */}
      {showingPreview && reportType === 'bloodwork' && (
        <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>
                Preview — {editablePreview.length} markers parsed
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Review before confirming. Click a cell to edit.</div>
              {parseWarning && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#FBBF24', backgroundColor: '#1C1500', border: '1px solid #78420020', borderRadius: 4, padding: '6px 10px' }}>
                  ⚠ {parseWarning}
                </div>
              )}
            </div>
            <button
              onClick={() => { setPreview(null); setActiveTab(0) }}
              style={{ fontSize: 12, color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Back
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Marker Name', 'Value', 'Unit', 'Range Low', 'Range High'].map(h => (
                    <th
                      key={h}
                      style={{ padding: '6px 10px', textAlign: 'left', color: TEXT_HINT, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editablePreview.map((m, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    {(['marker_name', 'value', 'unit', 'reference_range_low', 'reference_range_high'] as (keyof ParsedMarkerInput)[]).map(field => (
                      <td key={field} style={{ padding: '4px 6px' }}>
                        <input
                          value={String(m[field] ?? '')}
                          onChange={e => {
                            const updated = [...editablePreview]
                            const val = field === 'marker_name' || field === 'unit'
                              ? e.target.value
                              : parseFloat(e.target.value) || 0
                            updated[i] = { ...updated[i], [field]: val }
                            setEditablePreview(updated)
                          }}
                          style={{
                            backgroundColor: RAISED, border: `1px solid ${BORDER}`, borderRadius: 4,
                            padding: '4px 8px', color: TEXT_PRIMARY, fontSize: 12, width: '100%', outline: 'none',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <div style={{ color: RED, fontSize: 12, marginTop: 10 }}>{error}</div>}
          <button
            onClick={handleConfirmBloodwork}
            disabled={saving}
            style={{
              marginTop: 16, backgroundColor: GREEN, color: '#0A1E10', fontWeight: 600,
              fontSize: 13, padding: '11px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
            }}
          >
            {saving ? 'Creating report…' : 'Confirm & generate dashboard →'}
          </button>
        </div>
      )}
    </div>
  )
}
