'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { ProgrammeDay, Exercise, ExerciseLogEntry, SetEntry } from '@/lib/types'

interface SessionLoggerProps {
  day: ProgrammeDay
  onComplete: () => void
}

export function SessionLogger({ day, onComplete }: SessionLoggerProps) {
  const [entries, setEntries] = useState<ExerciseLogEntry[]>(
    day.exercises.map(ex => ({
      exercise_id: ex.id,
      exercise_name: ex.name,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        set_number: i + 1,
        weight_kg: null,
        reps_completed: null,
      })),
    }))
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function updateSet(exerciseIdx: number, setIdx: number, field: 'weight_kg' | 'reps_completed', value: string) {
    setEntries(prev => prev.map((entry, ei) =>
      ei !== exerciseIdx ? entry : {
        ...entry,
        sets: entry.sets.map((s, si) =>
          si !== setIdx ? s : { ...s, [field]: value ? parseFloat(value) : null }
        ),
      }
    ))
  }

  function addSet(exerciseIdx: number) {
    setEntries(prev => prev.map((entry, ei) =>
      ei !== exerciseIdx ? entry : {
        ...entry,
        sets: [...entry.sets, {
          set_number: entry.sets.length + 1,
          weight_kg: null,
          reps_completed: null,
        }],
      }
    ))
  }

  async function handleComplete() {
    setSaving(true)
    await fetch('/api/session-logs', {
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
        {day.exercises.map((exercise, exerciseIdx) => (
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
              <div className="grid grid-cols-3 gap-2 text-xs text-grey-muted mb-1">
                <span>Set</span>
                <span>Weight (kg)</span>
                <span>Reps</span>
              </div>
              {entries[exerciseIdx]?.sets.map((set, setIdx) => (
                <div key={setIdx} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-sm text-grey-muted">{set.set_number}</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    value={set.weight_kg ?? ''}
                    onChange={e => updateSet(exerciseIdx, setIdx, 'weight_kg', e.target.value)}
                    className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    value={set.reps_completed ?? ''}
                    onChange={e => updateSet(exerciseIdx, setIdx, 'reps_completed', e.target.value)}
                    className="bg-navy-deep border border-white/20 text-white/85 px-2 py-1.5 text-sm focus:outline-none focus:border-gold w-full"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(exerciseIdx)}
              className="flex items-center gap-1.5 text-gold text-xs mt-3"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              <Plus size={12} /> Add Set
            </button>
          </div>
        ))}
      </div>

      <Button variant="primary" size="lg" className="w-full mt-8" onClick={handleComplete} disabled={saving}>
        {saving ? 'Saving...' : 'Complete Workout'}
      </Button>
    </div>
  )
}
