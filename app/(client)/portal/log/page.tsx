'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { ScoreSelector } from '@/components/ui/ScoreSelector'

export default function DailyLogPage() {
  const [existingLog, setExistingLog] = useState<{ id?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const [trackWeight, setTrackWeight] = useState(true)
  const [weight, setWeight] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [steps, setSteps] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [hungerScore, setHungerScore] = useState<number | null>(null)
  const [trainingDone, setTrainingDone] = useState<boolean | null>(null)
  const [trainingNotes, setTrainingNotes] = useState('')
  const [energyScore, setEnergyScore] = useState<number | null>(null)
  const [stressScore, setStressScore] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function loadData() {
      try {
        const [logRes, clientRes] = await Promise.all([
          fetch('/api/logs/today'),
          fetch('/api/clients/me'),
        ])
        if (logRes.ok) {
          const log = await logRes.json()
          if (log && !log.error) {
            setExistingLog(log)
            setCalories(log.calories?.toString() || '')
            setProtein(log.protein?.toString() || '')
            setSteps(log.steps?.toString() || '')
            setSleepHours(log.sleep_hours?.toString() || '')
            setHungerScore(log.hunger_score)
            setTrainingDone(log.training_done)
            setTrainingNotes(log.training_notes || '')
            setEnergyScore(log.energy_score)
            setStressScore(log.stress_score)
            setNotes(log.notes || '')
            setWeight(log.weight?.toString() || '')
          }
        }
        if (clientRes.ok) {
          const clientData = await clientRes.json()
          setTrackWeight(clientData.track_weight ?? true)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    loadData()
  }, [today])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const body = {
      log_date: today,
      weight: trackWeight && weight ? parseFloat(weight) : null,
      calories: calories ? parseInt(calories) : null,
      protein: protein ? parseInt(protein) : null,
      steps: steps ? parseInt(steps) : null,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      hunger_score: hungerScore,
      energy_score: energyScore,
      stress_score: stressScore,
      training_done: trainingDone,
      training_notes: trainingDone ? trainingNotes : null,
      notes: notes || null,
    }

    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error || 'Failed to save log. Please try again.')
    }
    setSubmitting(false)
  }

  const todayFormatted = new Date().toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (saved) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Log Saved
        </h2>
        <p className="text-grey-muted mb-6">Your daily log has been saved.</p>
        <a href="/portal/progress" className="text-gold" style={{ fontFamily: 'var(--font-label)' }}>
          View Progress →
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Eyebrow>Daily Log</Eyebrow>
        <h1 className="text-3xl text-white mt-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Today's Log
        </h1>
        <p className="text-grey-muted text-sm">{todayFormatted}</p>
        {existingLog && (
          <div className="mt-3 bg-amber-900/20 border border-amber-700/50 px-4 py-2 text-sm text-amber-300">
            You've already logged today — editing your existing log.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Nutrition */}
        <div>
          <Eyebrow>Nutrition</Eyebrow>
          <GoldRule />
          {trackWeight && (
            <div className="mt-4">
              <Input label="Weight (kg)" type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 82.5" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input label="Calories (kcal)" type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="e.g. 2200" />
            <Input label="Protein (g)" type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="e.g. 160" />
            <Input label="Steps" type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="e.g. 8500" />
            <Input label="Sleep (hrs)" type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="e.g. 7.5" />
          </div>
          <div className="mt-4">
            <ScoreSelector label="Hunger (1 = not hungry, 5 = very hungry)" value={hungerScore} onChange={setHungerScore} />
          </div>
        </div>

        {/* Activity */}
        <div>
          <Eyebrow>Activity</Eyebrow>
          <GoldRule />
          <div className="mt-4">
            <p className="text-sm text-white/85 mb-3">Training done today?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTrainingDone(true)}
                className={`px-8 py-3 text-sm font-semibold transition-colors ${trainingDone === true ? 'bg-gold text-navy-deep' : 'bg-navy-card border border-white/20 text-white/85 hover:border-gold'}`}
                style={{ fontFamily: 'var(--font-label)' }}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setTrainingDone(false)}
                className={`px-8 py-3 text-sm font-semibold transition-colors ${trainingDone === false ? 'bg-gold text-navy-deep' : 'bg-navy-card border border-white/20 text-white/85 hover:border-gold'}`}
                style={{ fontFamily: 'var(--font-label)' }}
              >
                NO
              </button>
            </div>
            {trainingDone && (
              <div className="mt-4">
                <label className="text-sm text-white/85 block mb-1">Training Notes</label>
                <textarea
                  value={trainingNotes}
                  onChange={e => setTrainingNotes(e.target.value)}
                  className="w-full bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
                  rows={3}
                  placeholder="What did you do today?"
                />
              </div>
            )}
          </div>
        </div>

        {/* Biofeedback */}
        <div>
          <Eyebrow>Biofeedback</Eyebrow>
          <GoldRule />
          <div className="flex flex-col gap-4 mt-4">
            <ScoreSelector label="Energy (1 = very low, 5 = very high)" value={energyScore} onChange={setEnergyScore} />
            <ScoreSelector label="Stress (1 = very low, 5 = very high)" value={stressScore} onChange={setStressScore} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Eyebrow>Notes</Eyebrow>
          <GoldRule />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full mt-4 bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
            rows={4}
            placeholder="Anything else to note today..."
          />
        </div>

        {saveError && (
          <p className="text-red-400 text-sm">{saveError}</p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Today\'s Log'}
        </Button>
      </form>
    </div>
  )
}
