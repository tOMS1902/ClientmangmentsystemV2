'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { ScoreSelector } from '@/components/ui/ScoreSelector'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import type { MidweekCheck, TrackingStatus } from '@/lib/types'
import { displayWeight, toKg, unitLabel, type WeightUnit } from '@/lib/units'

function TrackToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: TrackingStatus | null
  onChange: (v: TrackingStatus) => void
}) {
  const options: { value: TrackingStatus; label: string }[] = [
    { value: 'yes', label: 'Yes' },
    { value: 'slightly_off', label: 'Slightly off' },
    { value: 'off', label: 'Off track' },
  ]
  return (
    <div>
      <p className="text-sm text-white/85 mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              value === opt.value
                ? 'bg-gold text-navy-deep'
                : 'bg-navy-card border border-white/20 text-white/70 hover:border-gold'
            }`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div>
      <p className="text-sm text-white/85 mb-2">{label}</p>
      <div className="flex gap-2">
        {[true, false].map(opt => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-6 py-2 text-xs font-semibold transition-colors ${
              value === opt
                ? 'bg-gold text-navy-deep'
                : 'bg-navy-card border border-white/20 text-white/70 hover:border-gold'
            }`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {opt ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MidweekCheckPage() {
  const [checks, setChecks] = useState<MidweekCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [midweekDay, setMidweekDay] = useState<string | null>(null)

  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [clientId, setClientId] = useState<string | null>(null)
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [showFormFields, setShowFormFields] = useState(true)
  const [currentWeight, setCurrentWeight] = useState('')
  const [trainingOnTrack, setTrainingOnTrack] = useState<TrackingStatus | null>(null)
  const [foodOnTrack, setFoodOnTrack] = useState<TrackingStatus | null>(null)
  const [energyLevel, setEnergyLevel] = useState<number | null>(null)
  const [stepsOnTrack, setStepsOnTrack] = useState<boolean | null>(null)
  const [biggestBlocker, setBiggestBlocker] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [checksRes, meRes] = await Promise.all([
          fetch('/api/midweek-checks/me'),
          fetch('/api/clients/me'),
        ])
        if (checksRes.ok) {
          const data = await checksRes.json()
          setChecks(Array.isArray(data) ? data : [])
        }
        if (meRes.ok) {
          const me = await meRes.json()
          setMidweekDay(me.midweek_check_day || 'Wednesday')
          setUnit(me.weight_unit === 'lbs' ? 'lbs' : 'kg')
          setClientId(me.id || null)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const thisWeekCheck = checks.find(c => {
    const diff = (Date.now() - new Date(c.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Voice note alone is enough — skip field validation
    if (!voiceNoteUrl) {
      if (!trainingOnTrack || !foodOnTrack || energyLevel === null || stepsOnTrack === null) {
        setSubmitError('Please fill in all required fields — or attach a voice note to submit without them.')
        return
      }
    }
    setSubmitting(true)
    setSubmitError('')
    const res = await fetch('/api/midweek-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_weight: currentWeight ? toKg(parseFloat(currentWeight), unit) : null,
        training_on_track: trainingOnTrack,
        food_on_track: foodOnTrack,
        energy_level: energyLevel,
        steps_on_track: stepsOnTrack,
        biggest_blocker: biggestBlocker || null,
        voice_note_url: voiceNoteUrl || null,
      }),
    })
    if (res.ok) {
      const newCheck = await res.json()
      setChecks([newCheck, ...checks])
      setSubmitted(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Failed to submit. Please try again.')
    }
    setSubmitting(false)
  }

  function statusLabel(v: TrackingStatus) {
    if (v === 'yes') return 'On track'
    if (v === 'slightly_off') return 'Slightly off'
    return 'Off track'
  }
  function statusColor(v: TrackingStatus) {
    if (v === 'yes') return 'text-green-400'
    if (v === 'slightly_off') return 'text-amber-400'
    return 'text-red-400'
  }

  if (loading) return <div className="text-grey-muted">Loading...</div>

  const todayName = new Date().toLocaleDateString('en-IE', { weekday: 'long' })
  if (midweekDay && todayName !== midweekDay) {
    return (
      <div className="max-w-xl">
        <Eyebrow>Midweek Check</Eyebrow>
        <GoldRule />
        <div className="mt-6 bg-navy-card border border-white/10 p-6 text-center">
          <p className="text-white/85 text-sm mb-1">Midweek check day is <span className="text-gold">{midweekDay}</span>.</p>
          <p className="text-grey-muted text-sm">Come back on {midweekDay} to submit your midweek check.</p>
        </div>
      </div>
    )
  }

  if (thisWeekCheck || submitted) {
    const check = thisWeekCheck || checks[0]
    return (
      <div className="max-w-xl">
        <div className="mb-6">
          <Eyebrow>Midweek Check</Eyebrow>
          <GoldRule />
          <p className="text-green-400 text-sm mt-4">Midweek check submitted for this week.</p>
        </div>
        {check && (
          <div className="bg-navy-card border border-white/8 p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {check.current_weight && (
                <div>
                  <p className="text-grey-muted mb-0.5">Weight</p>
                  <p className="text-white">{displayWeight(check.current_weight, unit)}{unitLabel(unit)}</p>
                </div>
              )}
              <div>
                <p className="text-grey-muted mb-0.5">Training</p>
                <p className={statusColor(check.training_on_track)}>{statusLabel(check.training_on_track)}</p>
              </div>
              <div>
                <p className="text-grey-muted mb-0.5">Food</p>
                <p className={statusColor(check.food_on_track)}>{statusLabel(check.food_on_track)}</p>
              </div>
              <div>
                <p className="text-grey-muted mb-0.5">Energy</p>
                <p className="text-white">{check.energy_level}/5</p>
              </div>
              <div>
                <p className="text-grey-muted mb-0.5">Steps</p>
                <p className={check.steps_on_track ? 'text-green-400' : 'text-red-400'}>{check.steps_on_track ? 'On track' : 'Off track'}</p>
              </div>
              {check.biggest_blocker && (
                <div className="col-span-2">
                  <p className="text-grey-muted mb-0.5">Biggest blocker</p>
                  <p className="text-white/85">{check.biggest_blocker}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-5">
        <Eyebrow>Midweek Check</Eyebrow>
        <h1 className="text-2xl text-white mt-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          How are things actually going this week?
        </h1>
        <GoldRule className="mt-3" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Voice note — at the top so clients can submit with just a recording */}
        <div className="border border-white/10 p-4">
          <button
            type="button"
            onClick={() => setVoiceOpen(v => !v)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-gold transition-colors w-full"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gold/60">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            {voiceNoteUrl ? 'Voice note recorded ✓' : 'Record a voice note instead'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={`ml-auto transition-transform ${voiceOpen ? 'rotate-180' : ''}`}>
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          {voiceOpen && clientId && (
            <div className="mt-4">
              <VoiceRecorder
                clientId={clientId}
                weekNumber={checks.length + 1}
                type="midweek"
                onComplete={url => { setVoiceNoteUrl(url); setShowFormFields(false) }}
                onDiscard={() => { setVoiceNoteUrl(null); setShowFormFields(true) }}
              />
            </div>
          )}
        </div>

        {voiceNoteUrl && (
          <div className="flex items-center gap-3 bg-gold/5 border border-gold/20 px-4 py-3">
            <span className="text-gold text-sm flex-1">Voice note recorded — the questions below are now optional.</span>
            <button
              type="button"
              onClick={() => setShowFormFields(v => !v)}
              className="text-xs text-white/50 hover:text-white/85 transition-colors shrink-0"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              {showFormFields ? 'Hide' : 'Add details'}
            </button>
          </div>
        )}

        {(!voiceNoteUrl || showFormFields) && <>

        {/* Weight */}
        <div>
          <label className="text-sm text-white/85 block mb-1">
            Current weight ({unitLabel(unit)}) <span className="text-grey-muted text-xs">(optional)</span>
          </label>
          <input
            type="number"
            step="0.1"
            value={currentWeight}
            onChange={e => setCurrentWeight(e.target.value)}
            placeholder={unit === 'lbs' ? 'e.g. 183.5' : 'e.g. 83.2'}
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full sm:w-40"
          />
        </div>

        {/* Training */}
        <TrackToggle
          label="Training on track?"
          value={trainingOnTrack}
          onChange={setTrainingOnTrack}
        />

        {/* Food */}
        <TrackToggle
          label="Food on track?"
          value={foodOnTrack}
          onChange={setFoodOnTrack}
        />

        {/* Energy */}
        <ScoreSelector
          label="Energy this week (1 = very low, 5 = very high)"
          value={energyLevel}
          onChange={setEnergyLevel}
        />

        {/* Steps */}
        <YesNoToggle
          label="Steps roughly on track?"
          value={stepsOnTrack}
          onChange={setStepsOnTrack}
        />

        {/* Biggest blocker */}
        <div>
          <label className="text-sm text-white/85 block mb-1">
            Biggest thing throwing you off? <span className="text-grey-muted text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={biggestBlocker}
            onChange={e => setBiggestBlocker(e.target.value)}
            placeholder="Keep it brief, no essay needed"
            className="w-full bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>

        </>}

        {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Check'}
        </Button>
      </form>
    </div>
  )
}
