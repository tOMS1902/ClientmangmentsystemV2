'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { ProgrammeDay, ExerciseLogEntry, SessionLog } from '@/lib/types'
import { displayWeight, toKg, unitLabel, type WeightUnit } from '@/lib/units'

interface SessionLoggerProps {
  day: ProgrammeDay
  lastSession?: SessionLog | null
  weightUnit?: WeightUnit
  onComplete: () => void
}

const BAND_COLOURS = ['Yellow', 'Red', 'Green', 'Blue', 'Black', 'Purple', 'Orange']

export function SessionLogger({ day, lastSession, weightUnit = 'kg', onComplete }: SessionLoggerProps) {
  // Display values stored as strings to avoid round-trip kg↔lbs conversion artifacts
  // Key format: "exerciseIdx-setIdx-field"
  const [displayValues, setDisplayValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {}
    day.exercises.forEach((ex, ei) => {
      const lastEntry = lastSession?.exercises_logged.find(e => e.exercise_id === ex.id)
      Array.from({ length: ex.sets }, (_, i) => {
        const lastSet = lastEntry?.sets.find(s => s.set_number === i + 1)
        if (lastSet?.weight_kg != null) vals[`${ei}-${i}-weight`] = String(displayWeight(lastSet.weight_kg, weightUnit))
        if (lastSet?.reps_completed != null) vals[`${ei}-${i}-reps`] = String(lastSet.reps_completed)
        if (lastSet?.band_colour) vals[`${ei}-${i}-band`] = lastSet.band_colour
        if (lastSet?.duration_seconds != null) vals[`${ei}-${i}-duration`] = String(lastSet.duration_seconds)
        if (lastSet?.distance_meters != null) vals[`${ei}-${i}-distance`] = String(lastSet.distance_meters)
      })
    })
    return vals
  })

  const [entries, setEntries] = useState<ExerciseLogEntry[]>(
    day.exercises.map(ex => {
      const lastEntry = lastSession?.exercises_logged.find(e => e.exercise_id === ex.id)
      return {
        exercise_id: ex.id,
        exercise_name: ex.name,
        sets: Array.from({ length: ex.sets }, (_, i) => {
          const lastSet = lastEntry?.sets.find(s => s.set_number === i + 1)
          return {
            set_number: i + 1,
            weight_kg: lastSet?.weight_kg ?? null,
            reps_completed: lastSet?.reps_completed ?? null,
            band_colour: lastSet?.band_colour ?? null,
            duration_seconds: lastSet?.duration_seconds ?? null,
            distance_meters: lastSet?.distance_meters ?? null,
          }
        }),
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function dKey(exerciseIdx: number, setIdx: number, field: string) {
    return `${exerciseIdx}-${setIdx}-${field}`
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select()
  }

  function updateSet(exerciseIdx: number, setIdx: number, field: string, value: string) {
    // Update display string directly — no round-trip conversion
    const df = field === 'weight_kg' ? 'weight' : field === 'reps_completed' ? 'reps' : field === 'duration_seconds' ? 'duration' : field === 'distance_meters' ? 'distance' : field === 'band_colour' ? 'band' : field
    setDisplayValues(prev => ({ ...prev, [dKey(exerciseIdx, setIdx, df)]: value }))

    // Update stored numeric value for save
    setEntries(prev => prev.map((entry, ei) =>
      ei !== exerciseIdx ? entry : {
        ...entry,
        sets: entry.sets.map((s, si) => {
          if (si !== setIdx) return s
          if (field === 'weight_kg') return { ...s, weight_kg: value ? toKg(parseFloat(value), weightUnit) : null }
          if (field === 'reps_completed') return { ...s, reps_completed: value ? parseInt(value) : null }
          if (field === 'band_colour') return { ...s, band_colour: value || null }
          if (field === 'duration_seconds') return { ...s, duration_seconds: value ? parseFloat(value) : null }
          if (field === 'distance_meters') return { ...s, distance_meters: value ? parseFloat(value) : null }
          return s
        }),
      }
    ))
  }

  function addSet(exerciseIdx: number) {
    setEntries(prev => {
      const entry = prev[exerciseIdx]
      const newSetIdx = entry ? entry.sets.length : 0
      // No display values to init — new set starts empty
      return prev.map((e, ei) =>
        ei !== exerciseIdx ? e : {
          ...e,
          sets: [...e.sets, {
            set_number: newSetIdx + 1,
            weight_kg: null,
            reps_completed: null,
            band_colour: null,
            duration_seconds: null,
            distance_meters: null,
          }],
        }
      )
    })
  }

  async function handleComplete() {
    setSaving(true)
    const logRes = await fetch('/api/session-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme_day_id: day.id,
        day_label: day.day_label,
        log_date: new Date().toISOString().split('T')[0],
        exercises_logged: entries,
        completed: true,
      }),
    })
    // Fire-and-forget: auto-complete matching planner item
    const logData = logRes.ok ? await logRes.json().catch(() => null) : null
    fetch('/api/weekly-plans/auto-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme_day_id: day.id,
        session_log_id: logData?.id ?? null,
      }),
    }).catch(() => {})
    setSaving(false)
    setDone(true)
    onComplete()
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>Session Complete</p>
        <p className="text-grey-muted text-sm">Great work. Session logged.</p>
      </div>
    )
  }

  return (
    <div>
      <Eyebrow>{day.day_label}</Eyebrow>
      <GoldRule />
      <div className="flex flex-col gap-6 mt-4">
        {day.exercises.map((exercise, exerciseIdx) => {
          const trackingType = exercise.tracking_type ?? 'weight'
          const lastEntry = lastSession?.exercises_logged.find(e => e.exercise_id === exercise.id)
          const hasLast = !!lastEntry

          return (
            <div key={exercise.id} className="bg-navy-card border border-white/8 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{exercise.name}</h3>
                  <p className="text-grey-muted text-xs mt-0.5">
                    Target: {exercise.sets} sets × {exercise.reps}
                    {exercise.rest_seconds ? ` · ${exercise.rest_seconds}s rest` : ''}
                  </p>
                </div>
                {exercise.video_url && (
                  <a
                    href={exercise.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold text-xs"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    ▶ Watch
                  </a>
                )}
              </div>

              {exercise.notes && (
                <p className="text-xs text-grey-muted mb-3 italic">{exercise.notes}</p>
              )}

              <div className="flex flex-col gap-2">
                {trackingType === 'weight' && (
                  <div className={`grid gap-2 text-xs text-grey-muted mb-1 ${hasLast ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <span>Set</span><span>Weight ({unitLabel(weightUnit)})</span><span>Reps</span>
                    {hasLast && <span>Last</span>}
                  </div>
                )}
                {trackingType === 'bodyweight' && (
                  <div className={`grid gap-2 text-xs text-grey-muted mb-1 ${hasLast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <span>Set</span><span>Reps</span>
                    {hasLast && <span>Last</span>}
                  </div>
                )}
                {trackingType === 'band' && (
                  <div className={`grid gap-2 text-xs text-grey-muted mb-1 ${hasLast ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <span>Set</span><span>Band</span><span>Reps</span>
                    {hasLast && <span>Last</span>}
                  </div>
                )}
                {trackingType === 'time' && (
                  <div className={`grid gap-2 text-xs text-grey-muted mb-1 ${hasLast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <span>Set</span><span>Duration (s)</span>
                    {hasLast && <span>Last</span>}
                  </div>
                )}
                {trackingType === 'distance' && (
                  <div className={`grid gap-2 text-xs text-grey-muted mb-1 ${hasLast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <span>Set</span><span>Distance (m)</span>
                    {hasLast && <span>Last</span>}
                  </div>
                )}

                {entries[exerciseIdx]?.sets.map((set, setIdx) => {
                  const lastSet = lastEntry?.sets.find(s => s.set_number === set.set_number)

                  if (trackingType === 'bodyweight') {
                    return (
                      <div key={setIdx} className={`grid gap-2 items-center ${hasLast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <span className="text-sm text-grey-muted">{set.set_number}</span>
                        <input
                          type="number" placeholder="0"
                          value={displayValues[dKey(exerciseIdx, setIdx, 'reps')] ?? ''}
                          onChange={e => updateSet(exerciseIdx, setIdx, 'reps_completed', e.target.value)}
                          onFocus={handleFocus}
                          className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                        />
                        {hasLast && <span className="text-xs text-gold/70">{lastSet?.reps_completed != null ? `${lastSet.reps_completed} reps` : '—'}</span>}
                      </div>
                    )
                  }

                  if (trackingType === 'band') {
                    return (
                      <div key={setIdx} className={`grid gap-2 items-center ${hasLast ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <span className="text-sm text-grey-muted">{set.set_number}</span>
                        <select
                          value={displayValues[dKey(exerciseIdx, setIdx, 'band')] ?? ''}
                          onChange={e => updateSet(exerciseIdx, setIdx, 'band_colour', e.target.value)}
                          className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                        >
                          <option value="">Band</option>
                          {BAND_COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          type="number" placeholder="0"
                          value={displayValues[dKey(exerciseIdx, setIdx, 'reps')] ?? ''}
                          onChange={e => updateSet(exerciseIdx, setIdx, 'reps_completed', e.target.value)}
                          onFocus={handleFocus}
                          className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                        />
                        {hasLast && (
                          <span className="text-xs text-gold/70">
                            {lastSet?.band_colour ? `${lastSet.band_colour}${lastSet.reps_completed != null ? ` × ${lastSet.reps_completed}` : ''}` : '—'}
                          </span>
                        )}
                      </div>
                    )
                  }

                  if (trackingType === 'time') {
                    return (
                      <div key={setIdx} className={`grid gap-2 items-center ${hasLast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <span className="text-sm text-grey-muted">{set.set_number}</span>
                        <input
                          type="number" placeholder="0"
                          value={displayValues[dKey(exerciseIdx, setIdx, 'duration')] ?? ''}
                          onChange={e => updateSet(exerciseIdx, setIdx, 'duration_seconds', e.target.value)}
                          onFocus={handleFocus}
                          className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                        />
                        {hasLast && <span className="text-xs text-gold/70">{lastSet?.duration_seconds != null ? `${lastSet.duration_seconds}s` : '—'}</span>}
                      </div>
                    )
                  }

                  if (trackingType === 'distance') {
                    return (
                      <div key={setIdx} className={`grid gap-2 items-center ${hasLast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <span className="text-sm text-grey-muted">{set.set_number}</span>
                        <input
                          type="number" placeholder="0"
                          value={displayValues[dKey(exerciseIdx, setIdx, 'distance')] ?? ''}
                          onChange={e => updateSet(exerciseIdx, setIdx, 'distance_meters', e.target.value)}
                          onFocus={handleFocus}
                          className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                        />
                        {hasLast && <span className="text-xs text-gold/70">{lastSet?.distance_meters != null ? `${lastSet.distance_meters}m` : '—'}</span>}
                      </div>
                    )
                  }

                  // Default: weight tracking
                  return (
                    <div key={setIdx} className={`grid gap-2 items-center ${hasLast ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <span className="text-sm text-grey-muted">{set.set_number}</span>
                      <input
                        type="number" step="0.5" placeholder="0"
                        value={displayValues[dKey(exerciseIdx, setIdx, 'weight')] ?? ''}
                        onChange={e => updateSet(exerciseIdx, setIdx, 'weight_kg', e.target.value)}
                        onFocus={handleFocus}
                        className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                      />
                      <input
                        type="number" placeholder="0"
                        value={displayValues[dKey(exerciseIdx, setIdx, 'reps')] ?? ''}
                        onChange={e => updateSet(exerciseIdx, setIdx, 'reps_completed', e.target.value)}
                        onFocus={handleFocus}
                        className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                      />
                      {hasLast && (
                        <span className="text-xs text-gold/70">
                          {lastSet?.weight_kg != null
                            ? `${displayWeight(lastSet.weight_kg, weightUnit)}${unitLabel(weightUnit)}${lastSet.reps_completed != null ? ` × ${lastSet.reps_completed}` : ''}`
                            : '—'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => addSet(exerciseIdx)}
                className="flex items-center gap-1.5 text-gold text-xs mt-3"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                <Plus size={12} /> Add Set
              </button>
            </div>
          )
        })}
      </div>

      <Button variant="primary" size="lg" className="w-full mt-8" onClick={handleComplete} disabled={saving}>
        {saving ? 'Saving...' : 'Complete Workout'}
      </Button>
    </div>
  )
}
