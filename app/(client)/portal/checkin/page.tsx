'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { SparkLine } from '@/components/ui/SparkLine'
import { ProgressPhotoUpload } from '@/components/photos/ProgressPhotoUpload'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import type { WeeklyCheckin } from '@/lib/types'
import { displayWeight, toKg, unitLabel, type WeightUnit } from '@/lib/units'

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({ number, label, children }: { number: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-3">
        <span className="text-gold text-xs mr-2" style={{ fontFamily: 'var(--font-label)' }}>{number}.</span>
        <span className="text-white/85 text-sm">{label}</span>
      </label>
      {children}
    </div>
  )
}

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="py-3">
      <style>{`
        .gold-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .gold-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #b8962e;
          cursor: pointer;
          margin-top: -14px;
          box-shadow: 0 0 0 5px rgba(184,150,46,0.2), 0 2px 8px rgba(0,0,0,0.4);
        }
        .gold-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
        }
        .gold-slider::-moz-range-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #b8962e;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 5px rgba(184,150,46,0.2), 0 2px 8px rgba(0,0,0,0.4);
        }
        .gold-slider::-moz-range-track {
          height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
        }
      `}</style>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="gold-slider"
      />
      <div className="flex justify-between items-center mt-4">
        <span className="text-grey-muted text-xs">1</span>
        <span className="text-gold text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {value}<span className="text-grey-muted text-sm font-normal"> / 10</span>
        </span>
        <span className="text-grey-muted text-xs">10</span>
      </div>
    </div>
  )
}

function ButtonGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 text-sm border transition-colors ${
            value === opt.value
              ? 'border-gold bg-gold/10 text-gold'
              : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white/85'
          }`}
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ShortText({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={2}
      placeholder={placeholder}
      className="w-full bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
    />
  )
}

function ChartCard({
  label,
  data,
  unit = '',
  color = '#b8962e',
}: {
  label: string
  data: (number | null)[]
  unit?: string
  color?: string
}) {
  const clean = data.filter((v): v is number => v != null)
  if (clean.length < 2) return null
  const latest = clean[clean.length - 1]
  return (
    <div className="bg-navy-card border border-white/8 p-4">
      <p className="text-xs text-grey-muted mb-1" style={{ fontFamily: 'var(--font-label)' }}>
        {label.toUpperCase()}
      </p>
      <p className="text-white text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        {latest}{unit}
      </p>
      <SparkLine data={clean} width={150} height={36} color={color} />
    </div>
  )
}

// ─── Option sets ─────────────────────────────────────────────────────────────

const DIET_OPTIONS = [
  { value: 'on_track', label: 'On track' },
  { value: 'mostly_on_track', label: 'Mostly on track' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'off_track', label: 'Off track' },
]

const TRAINING_OPTIONS = [
  { value: 'all', label: 'All sessions done' },
  { value: 'missed_1', label: 'Missed 1' },
  { value: 'missed_2plus', label: 'Missed 2+' },
  { value: 'none', label: 'None' },
]

const FOCUS_OPTIONS = [
  { value: 'Food', label: 'Food' },
  { value: 'Training', label: 'Training' },
  { value: 'Steps', label: 'Steps' },
  { value: 'Sleep', label: 'Sleep' },
  { value: 'Routine', label: 'Routine' },
  { value: 'Consistency', label: 'Consistency' },
]

function labelFor(options: { value: string; label: string }[], value: string | null) {
  return options.find(o => o.value === value)?.label ?? value ?? '—'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [validationError, setValidationError] = useState(false)
  const [submittedCheckinId, setSubmittedCheckinId] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)
  const [checkInDay, setCheckInDay] = useState<string | null>(null)
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [showFormFields, setShowFormFields] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form state
  const [weekScore, setWeekScore] = useState(5)
  const [weight, setWeight] = useState('')
  const [dietRating, setDietRating] = useState('')
  const [trainingCompleted, setTrainingCompleted] = useState('')
  const [energyScore, setEnergyScore] = useState(5)
  const [sleepScore, setSleepScore] = useState(5)
  const [hungerScore, setHungerScore] = useState(5)
  const [cravingsScore, setCravingsScore] = useState(5)
  const [avgSteps, setAvgSteps] = useState('')
  const [biggestWin, setBiggestWin] = useState('')
  const [mainChallenge, setMainChallenge] = useState('')
  const [focusAreas, setFocusAreas] = useState('')
  const [improveNextWeek, setImproveNextWeek] = useState('')
  const [coachSupport, setCoachSupport] = useState('')
  const [anythingElse, setAnythingElse] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [checkinsRes, meRes] = await Promise.all([
          fetch('/api/checkins/me'),
          fetch('/api/clients/me'),
        ])
        if (checkinsRes.ok) setCheckins(await checkinsRes.json() || [])
        if (meRes.ok) {
          const me = await meRes.json()
          setCheckInDay(me.check_in_day || null)
          setClientId(me.id || null)
          setUnit(me.weight_unit === 'lbs' ? 'lbs' : 'kg')
          setClientName(me.full_name || null)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const thisWeekCheckin = checkins.find(c => {
    const diff = (Date.now() - new Date(c.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Voice note alone is enough — skip field validation
    if (!voiceNoteUrl) {
      if (!dietRating || !trainingCompleted || !focusAreas || !biggestWin.trim() || !mainChallenge.trim() || !improveNextWeek.trim()) {
        setValidationError(true)
        return
      }
    }
    setValidationError(false)
    setConfirmOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: weight ? toKg(parseFloat(weight), unit) : null,
        week_score: weekScore,
        diet_rating: dietRating,
        training_completed: trainingCompleted,
        energy_score: energyScore,
        sleep_score: sleepScore,
        hunger_score: hungerScore,
        cravings_score: cravingsScore,
        avg_steps: avgSteps || null,
        biggest_win: biggestWin,
        main_challenge: mainChallenge,
        focus_areas: focusAreas,
        improve_next_week: improveNextWeek,
        coach_support: coachSupport || null,
        anything_else: anythingElse || null,
        voice_note_url: voiceNoteUrl || null,
      }),
    })
    if (res.ok) {
      const newCheckin = await res.json()
      setCheckins([newCheckin, ...checkins])
      setSubmittedCheckinId(newCheckin.id)
      setClientId(newCheckin.client_id)
      setSubmitted(true)
    } else {
      const err = await res.json().catch(() => ({}))
      setSubmitError(err.error || 'Something went wrong. Please try again.')
    }
    setSubmitting(false)
    setConfirmOpen(false)
  }

  if (loading) return <div className="text-grey-muted">Loading...</div>

  const todayName = new Date().toLocaleDateString('en-IE', { weekday: 'long' })
  if (checkInDay && todayName !== checkInDay) {
    return (
      <div className="max-w-xl">
        <Eyebrow>Weekly Check-In</Eyebrow>
        <GoldRule />
        <div className="mt-6 bg-navy-card border border-white/10 p-6 text-center">
          <p className="text-white/85 text-sm mb-1">Check-in day is <span className="text-gold">{checkInDay}</span>.</p>
          <p className="text-grey-muted text-sm">Come back on {checkInDay} to submit your weekly check-in.</p>
        </div>
      </div>
    )
  }

  if (thisWeekCheckin || submitted) {
    const sorted = [...checkins].reverse() // oldest → newest for charts
    const weightData = sorted.map(c => c.weight)
    const weekScoreData = sorted.map(c => c.week_score)
    const hungerData = sorted.map(c => c.hunger_score)
    const cravingsData = sorted.map(c => c.cravings_score)
    const hasCharts = weightData.filter(Boolean).length >= 2 || weekScoreData.filter(Boolean).length >= 2

    return (
      <div>
        <div className="mb-8">
          <Eyebrow>Check-In</Eyebrow>
          <GoldRule />
          <p className="text-white mt-4">
            {clientName ? `Great work, ${clientName.split(' ')[0]}! ` : ''}Your check-in has been successfully saved.
          </p>
          <p className="text-grey-muted text-sm mt-1">
            Next check-in: next {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IE', { weekday: 'long' })}
          </p>
        </div>

        {submittedCheckinId && clientId && (
          <div className="mb-8">
            <ProgressPhotoUpload clientId={clientId} weekNumber={checkins.length} checkInId={submittedCheckinId} />
          </div>
        )}

        {hasCharts && (
          <div className="mb-8">
            <Eyebrow>Your Progress</Eyebrow>
            <GoldRule className="mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <ChartCard label="Weight" data={weightData.map(w => w != null ? displayWeight(w, unit) : null)} unit={unitLabel(unit)} color="#b8962e" />
              <ChartCard label="Weekly Score" data={weekScoreData} color="#b8962e" />
              <ChartCard label="Hunger" data={hungerData} color="#6b7280" />
              <ChartCard label="Cravings" data={cravingsData} color="#6b7280" />
            </div>
          </div>
        )}

        {checkins.length > 0 && (
          <div>
            <Eyebrow>Previous Check-Ins</Eyebrow>
            <GoldRule />
            <div className="flex flex-col gap-4 mt-4">
              {checkins.map(c => (
                <details key={c.id} className="bg-navy-card border border-white/8">
                  <summary className="p-4 cursor-pointer flex items-center justify-between">
                    <span className="text-white" style={{ fontFamily: 'var(--font-display)' }}>Week {c.week_number}</span>
                    <span className="text-grey-muted text-sm">
                      {new Date(c.check_in_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long' })}
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <GoldRule />
                    <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                      <div><p className="text-grey-muted">Weight</p><p className="text-white">{c.weight != null ? `${displayWeight(c.weight, unit)}${unitLabel(unit)}` : '—'}</p></div>
                      {c.week_score != null && <div><p className="text-grey-muted">Week Score</p><p className="text-white">{c.week_score}/10</p></div>}
                      {c.diet_rating && <div><p className="text-grey-muted">Food</p><p className="text-white">{labelFor(DIET_OPTIONS, c.diet_rating)}</p></div>}
                      {c.training_completed && <div><p className="text-grey-muted">Training</p><p className="text-white">{labelFor(TRAINING_OPTIONS, c.training_completed)}</p></div>}
                      {c.energy_score != null && <div><p className="text-grey-muted">Energy</p><p className="text-white">{c.energy_score}/10</p></div>}
                      {c.sleep_score != null && <div><p className="text-grey-muted">Sleep</p><p className="text-white">{c.sleep_score}/10</p></div>}
                      {c.hunger_score != null && <div><p className="text-grey-muted">Hunger</p><p className="text-white">{c.hunger_score}/10</p></div>}
                      {c.cravings_score != null && <div><p className="text-grey-muted">Cravings</p><p className="text-white">{c.cravings_score}/10</p></div>}
                      {c.avg_steps && <div><p className="text-grey-muted">Avg Steps</p><p className="text-white">{c.avg_steps}</p></div>}
                      {c.focus_areas && <div><p className="text-grey-muted">Focus Next Week</p><p className="text-white">{c.focus_areas}</p></div>}
                      {c.biggest_win && <div className="col-span-2"><p className="text-grey-muted">Biggest Win</p><p className="text-white">{c.biggest_win}</p></div>}
                      {c.main_challenge && <div className="col-span-2"><p className="text-grey-muted">Biggest Challenge</p><p className="text-white">{c.main_challenge}</p></div>}
                      {c.improve_next_week && <div className="col-span-2"><p className="text-grey-muted">Make Next Week Better</p><p className="text-white">{c.improve_next_week}</p></div>}
                      {c.coach_support && <div className="col-span-2"><p className="text-grey-muted">Support Needed</p><p className="text-white">{c.coach_support}</p></div>}
                      {c.anything_else && <div className="col-span-2"><p className="text-grey-muted">Anything Else</p><p className="text-white">{c.anything_else}</p></div>}
                      {/* Legacy text fields */}
                      {c.week_summary && !c.week_score && <div className="col-span-2"><p className="text-grey-muted">Week Summary</p><p className="text-white">{c.week_summary}</p></div>}
                      {c.diet_summary && !c.diet_rating && <div className="col-span-2"><p className="text-grey-muted">Food</p><p className="text-white">{c.diet_summary}</p></div>}
                      {c.energy_summary && !c.energy_score && <div className="col-span-2"><p className="text-grey-muted">Energy</p><p className="text-white">{c.energy_summary}</p></div>}
                      {c.sleep_summary && !c.sleep_score && <div className="col-span-2"><p className="text-grey-muted">Sleep</p><p className="text-white">{c.sleep_summary}</p></div>}
                      {c.coach_notes && (
                        <div className="col-span-2 mt-2 pt-3 border-t border-white/8">
                          <p className="text-grey-muted text-xs mb-1">Coach Notes</p>
                          <p className="text-white/85">{c.coach_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Eyebrow>Weekly Check-In</Eyebrow>
        <h1 className="text-3xl text-white mt-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Weekly Check-In
        </h1>
        <GoldRule className="mt-3" />
      </div>

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">

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
                weekNumber={checkins.length + 1}
                type="weekly"
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

        <Field number={1} label="How was your week overall?">
          <Slider value={weekScore} onChange={setWeekScore} />
        </Field>

        <Field number={2} label={`Current weight (${unitLabel(unit)})`}>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder={unit === 'lbs' ? 'e.g. 182.0' : 'e.g. 82.5'}
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </Field>

        <Field number={3} label="How did you get on with your food this week?">
          <ButtonGroup options={DIET_OPTIONS} value={dietRating} onChange={setDietRating} />
        </Field>

        <Field number={4} label="Training this week">
          <ButtonGroup options={TRAINING_OPTIONS} value={trainingCompleted} onChange={setTrainingCompleted} />
        </Field>

        <Field number={5} label="Energy this week">
          <Slider value={energyScore} onChange={setEnergyScore} />
        </Field>

        <Field number={6} label="Sleep this week">
          <Slider value={sleepScore} onChange={setSleepScore} />
        </Field>

        <Field number={7} label="Hunger this week">
          <Slider value={hungerScore} onChange={setHungerScore} />
        </Field>

        <Field number={8} label="Cravings this week">
          <Slider value={cravingsScore} onChange={setCravingsScore} />
        </Field>

        <Field number={9} label="Average daily steps">
          <input
            type="number"
            value={avgSteps}
            onChange={e => setAvgSteps(e.target.value)}
            placeholder="e.g. 8500"
            className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold w-full"
          />
        </Field>

        <Field number={10} label="Biggest win this week">
          <ShortText value={biggestWin} onChange={setBiggestWin} placeholder="What went really well?" />
        </Field>

        <Field number={11} label="Biggest challenge this week">
          <ShortText value={mainChallenge} onChange={setMainChallenge} placeholder="What was the hardest part?" />
        </Field>

        <Field number={12} label="What needs most focus next week?">
          <ButtonGroup options={FOCUS_OPTIONS} value={focusAreas} onChange={setFocusAreas} />
        </Field>

        <Field number={13} label="What can you do to make next week better?">
          <ShortText value={improveNextWeek} onChange={setImproveNextWeek} placeholder="1–2 specific actions..." />
        </Field>

        <Field number={14} label="Do you need anything from me?">
          <ShortText value={coachSupport} onChange={setCoachSupport} placeholder="Support, changes, questions..." />
        </Field>

        <Field number={15} label="Anything else I should know?">
          <ShortText value={anythingElse} onChange={setAnythingElse} placeholder="Anything else worth mentioning..." />
        </Field>

        </>}

        {validationError && (
          <p className="text-red-400 text-sm">Please fill in all required fields — or attach a voice note to submit without them.</p>
        )}

        {submitError && (
          <p className="text-red-400 text-sm">{submitError}</p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Submit Check-In
        </Button>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 p-6 max-w-sm w-full">
            <h3 className="text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Confirm Submission</h3>
            <p className="text-grey-muted text-sm mb-5">Once submitted, this cannot be edited. Continue?</p>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
