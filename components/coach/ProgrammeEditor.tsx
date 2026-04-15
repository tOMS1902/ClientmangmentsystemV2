'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, ChevronRight, Plus, Copy, Check, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Programme, ProgrammeDay, Exercise } from '@/lib/types'

interface ProgrammeEditorProps {
  clientId: string
  initialProgrammes: Programme[]
  initialLastWeights?: Record<string, number | null>
}

interface SessionInput {
  weight: string
  reps: string
}

interface ExerciseFormData {
  name: string
  sets: string
  reps: string
  rest_seconds: string
  video_url: string
  notes: string
}

const emptyExerciseForm: ExerciseFormData = {
  name: '', sets: '', reps: '', rest_seconds: '', video_url: '', notes: '',
}

function makeTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ProgrammeEditor({ clientId, initialProgrammes, initialLastWeights = {} }: ProgrammeEditorProps) {
  const router = useRouter()
  const [plans, setPlans] = useState<Programme[]>(initialProgrammes)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [addingExercise, setAddingExercise] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormData>(emptyExerciseForm)

  // Log Session state
  const [localLastWeights, setLocalLastWeights] = useState<Record<string, number | null>>(initialLastWeights)
  const [loggingDayId, setLoggingDayId] = useState<string | null>(null)
  const [sessionInputs, setSessionInputs] = useState<Record<string, SessionInput>>({})
  const [savingSession, setSavingSession] = useState(false)
  const [sessionMsg, setSessionMsg] = useState('')

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importTargetId, setImportTargetId] = useState('')
  const [importStep, setImportStep] = useState<'prompt' | 'paste'>('prompt')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [extraContext, setExtraContext] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  // Plan operations
  function addNewPlan() {
    const newPlan: Programme = {
      id: makeTempId(),
      client_id: clientId,
      name: 'New Plan',
      is_active: true,
      created_at: new Date().toISOString(),
      days: [],
    }
    setPlans(prev => [...prev, newPlan])
  }

  async function deletePlan(planId: string) {
    if (!planId.startsWith('temp-')) {
      await fetch(`/api/programme/${planId}`, { method: 'DELETE' })
    }
    setPlans(prev => prev.filter(p => p.id !== planId))
  }

  function updatePlan(planId: string, updater: (p: Programme) => Programme) {
    setPlans(prev => prev.map(p => p.id === planId ? updater(p) : p))
  }

  // Day operations
  function toggleDay(dayId: string) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      next.has(dayId) ? next.delete(dayId) : next.add(dayId)
      return next
    })
  }

  function addDay(planId: string) {
    updatePlan(planId, plan => {
      const newDay: ProgrammeDay = {
        id: `new-day-${Date.now()}`,
        programme_id: plan.id,
        day_number: plan.days.length + 1,
        day_label: `Day ${plan.days.length + 1}`,
        sort_order: plan.days.length + 1,
        exercises: [],
      }
      return { ...plan, days: [...plan.days, newDay] }
    })
  }

  function deleteDay(planId: string, dayId: string) {
    updatePlan(planId, plan => ({ ...plan, days: plan.days.filter(d => d.id !== dayId) }))
  }

  function updateDayLabel(planId: string, dayId: string, label: string) {
    updatePlan(planId, plan => ({
      ...plan,
      days: plan.days.map(d => d.id === dayId ? { ...d, day_label: label } : d),
    }))
  }

  // Exercise operations
  function addExercise(planId: string, dayId: string) {
    if (!exerciseForm.name) return
    updatePlan(planId, plan => {
      const exercise: Exercise = {
        id: `new-ex-${Date.now()}`,
        day_id: dayId,
        name: exerciseForm.name,
        sets: parseInt(exerciseForm.sets) || 3,
        reps: exerciseForm.reps || '10',
        rest_seconds: exerciseForm.rest_seconds ? parseInt(exerciseForm.rest_seconds) : null,
        video_url: exerciseForm.video_url || null,
        notes: exerciseForm.notes || null,
        sort_order: (plan.days.find(d => d.id === dayId)?.exercises.length || 0) + 1,
      }
      return {
        ...plan,
        days: plan.days.map(d => d.id === dayId ? { ...d, exercises: [...d.exercises, exercise] } : d),
      }
    })
    setExerciseForm(emptyExerciseForm)
    setAddingExercise(null)
  }

  function deleteExercise(planId: string, dayId: string, exerciseId: string) {
    updatePlan(planId, plan => ({
      ...plan,
      days: plan.days.map(d =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) } : d
      ),
    }))
  }

  // Client has asked for inline editing of exercise fields (sets, reps, rest, name, notes)
  function updateExercise(planId: string, dayId: string, exerciseId: string, field: 'name' | 'sets' | 'reps' | 'rest_seconds' | 'notes' | 'video_url', value: string) {
    updatePlan(planId, plan => ({
      ...plan,
      days: plan.days.map(d =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map(e =>
                e.id === exerciseId
                  ? {
                      ...e,
                      [field]: field === 'sets' ? (parseInt(value) || e.sets)
                               : field === 'rest_seconds' ? (value === '' ? null : parseInt(value) || e.rest_seconds)
                               : value,
                    }
                  : e
              ),
            }
          : d
      ),
    }))
  }

  // Save plan — POST for new, PATCH for existing
  async function savePlan(plan: Programme) {
    const planId = plan.id
    const isNew = planId.startsWith('temp-')
    setSaving(prev => ({ ...prev, [planId]: true }))
    setMessages(prev => ({ ...prev, [planId]: '' }))

    const dayPayload = plan.days.map(d => ({
      day_label: d.day_label,
      exercises: d.exercises.map(e => ({
        name: e.name, sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds, video_url: e.video_url, notes: e.notes,
      })),
    }))

    try {
      const res = await fetch(isNew ? '/api/programme' : `/api/programme/${planId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isNew
            ? { clientId, name: plan.name || 'Training Plan', days: dayPayload }
            : { name: plan.name, days: dayPayload }
        ),
      })
      const data = await res.json()
      if (res.ok) {
        if (isNew) {
          setPlans(prev => prev.map(p => p.id === planId ? { ...p, id: data.id } : p))
          setSaving(prev => { const n = { ...prev }; delete n[planId]; return n })
          setMessages(prev => { const n = { ...prev }; delete n[planId]; n[data.id] = 'Saved.'; return n })
          setTimeout(() => setMessages(prev => { const n = { ...prev }; delete n[data.id]; return n }), 3000)
        } else {
          setSaving(prev => ({ ...prev, [planId]: false }))
          setMessages(prev => ({ ...prev, [planId]: 'Saved.' }))
          setTimeout(() => setMessages(prev => ({ ...prev, [planId]: '' })), 3000)
        }
        router.refresh()
      } else {
        setSaving(prev => ({ ...prev, [planId]: false }))
        setMessages(prev => ({ ...prev, [planId]: `Error: ${data.error || 'Failed to save.'}` }))
      }
    } catch {
      setSaving(prev => ({ ...prev, [planId]: false }))
      setMessages(prev => ({ ...prev, [planId]: 'Network error.' }))
    }
  }

  // Log Session
  function startLogSession(day: ProgrammeDay) {
    const inputs: Record<string, SessionInput> = {}
    for (const ex of day.exercises) {
      inputs[ex.id] = {
        weight: localLastWeights[ex.id] != null ? String(localLastWeights[ex.id]) : '',
        reps: ex.reps || '',
      }
    }
    setSessionInputs(inputs)
    setLoggingDayId(day.id)
    setExpandedDays(prev => new Set([...prev, day.id]))
  }

  function cancelLogSession() {
    setLoggingDayId(null)
    setSessionInputs({})
    setSessionMsg('')
  }

  async function saveSession(clientIdArg: string, day: ProgrammeDay) {
    setSavingSession(true)
    setSessionMsg('')

    const entries = day.exercises
      .filter(ex => !ex.id.startsWith('new-ex-') && sessionInputs[ex.id]?.weight !== '')
      .map(ex => ({
        exercise_id: ex.id,
        weight_kg: parseFloat(sessionInputs[ex.id]?.weight || '0'),
        reps_completed: parseInt(sessionInputs[ex.id]?.reps || '0') || 0,
        set_number: 1,
      }))
      .filter(e => !isNaN(e.weight_kg) && e.weight_kg > 0)

    if (!entries.length) {
      cancelLogSession()
      setSavingSession(false)
      return
    }

    try {
      const res = await fetch('/api/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientIdArg, day_id: day.id, entries }),
      })
      if (res.ok) {
        const updates: Record<string, number> = {}
        for (const e of entries) updates[e.exercise_id] = e.weight_kg
        setLocalLastWeights(prev => ({ ...prev, ...updates }))
        setLoggingDayId(null)
        setSessionInputs({})
        setSessionMsg('Session logged.')
        setTimeout(() => setSessionMsg(''), 3000)
      } else {
        const data = await res.json()
        setSessionMsg(data.error || 'Failed to save session.')
      }
    } catch {
      setSessionMsg('Network error.')
    }
    setSavingSession(false)
  }

  // Import modal
  async function openImportModal(planId: string) {
    setImportTargetId(planId)
    setImportModalOpen(true)
    setImportStep('prompt')
    setImportText('')
    setExtraContext('')
    setCopied(false)
    setPromptLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${clientId}`)
      const data = await res.json()
      const r: Record<string, string> = data?.responses || {}
      setGeneratedPrompt(
        `You are a professional fitness coach. Create a detailed training programme for a client with the following profile:\n\nPrimary goals: ${r.primary_goals || 'Not specified'}\nWeight: ${r.weight_kg || '?'}kg | Age: ${r.age || '?'} | Height: ${r.height || 'Not specified'}\nTraining experience: ${r.training_experience || 'Not specified'}\nTraining days per week: ${r.training_days || '3'}\nPreferred style: ${r.preferred_style || 'Not specified'}\nPreferred structure: ${r.workout_structure || 'Not specified'}\nPreferred time: ${r.preferred_time || 'Not specified'}\nInjuries / limitations: ${r.injuries || 'None'}\nEquipment / exercises to avoid: ${r.avoid_exercises || 'None'}\nAreas to prioritise: ${r.priority_areas || 'Not specified'}\nSpecific strength goals: ${r.strength_goals || 'Not specified'}\nMobility / prehab: ${r.mobility_prehab || 'Not specified'}\n\nReturn ONLY valid JSON in this exact format with no other text:\n\n{"name":"string","days":[{"day_label":"string","exercises":[{"name":"string","sets":number,"reps":"string","rest_seconds":number|null,"notes":"string|null"}]}]}`
      )
    } catch {
      setGeneratedPrompt('Failed to load onboarding data. Please ensure the client has completed onboarding.')
    }
    setPromptLoading(false)
  }

  function buildFullPrompt() {
    if (!extraContext.trim()) return generatedPrompt
    return `${generatedPrompt}\n\nAdditional coach notes: ${extraContext.trim()}`
  }

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(buildFullPrompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleParseResponse() {
    if (!importText.trim()) return
    setImportLoading(true)
    setImportError('')
    try {
      const res = await fetch('/api/ai/import-programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, clientId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error || 'Failed to parse response.')
      } else if (data.name && data.days) {
        const prefix = `imported-${Date.now()}`
        updatePlan(importTargetId, plan => ({
          ...plan,
          name: data.name,
          days: data.days.map((d: { day_label: string; exercises: { name: string; sets: number; reps: string; rest_seconds: number | null; notes: string | null }[] }, i: number) => ({
            id: `${prefix}-day-${i}`,
            programme_id: plan.id,
            day_number: i + 1,
            day_label: d.day_label,
            sort_order: i + 1,
            exercises: d.exercises.map((e, j) => ({
              id: `${prefix}-ex-${i}-${j}`,
              day_id: `${prefix}-day-${i}`,
              video_url: null,
              ...e,
              sort_order: j + 1,
            })),
          })),
        }))
        setImportModalOpen(false)
        setImportText('')
        setImportError('')
      }
    } catch {
      setImportError('Unexpected error. Please try again.')
    }
    setImportLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>Training Plans</h2>
        <Button variant="ghost" size="sm" onClick={addNewPlan}>
          + Add New Plan
        </Button>
      </div>

      {plans.length === 0 && (
        <p className="text-grey-muted text-sm">No training plans yet. Add one above.</p>
      )}

      {plans.map(plan => (
        <div key={plan.id} className="mb-8 border border-white/8">
          {/* Plan header */}
          <div className="flex items-center justify-between px-4 py-4 bg-navy-mid border-b border-white/8 flex-wrap gap-3">
            <input
              value={plan.name}
              onChange={e => updatePlan(plan.id, p => ({ ...p, name: e.target.value }))}
              placeholder="Plan name..."
              className="bg-transparent text-white text-base border-b border-white/20 focus:border-gold focus:outline-none pb-0.5 min-w-0 w-48"
              style={{ fontFamily: 'var(--font-display)' }}
            />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => openImportModal(plan.id)}>
                Import with AI
              </Button>
              <Button variant="primary" size="sm" onClick={() => savePlan(plan)} disabled={saving[plan.id]}>
                {saving[plan.id] ? 'Saving...' : 'Save'}
              </Button>
              <button
                onClick={() => deletePlan(plan.id)}
                className="text-grey-muted hover:text-white p-1.5"
                title="Delete plan"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {messages[plan.id] && (
            <p className="text-gold text-xs px-4 py-2">{messages[plan.id]}</p>
          )}

          {/* Days */}
          <div className="p-4">
            {plan.days.map(day => (
              <div key={day.id} className="mb-3 border border-white/8">
                <div
                  className="flex items-center justify-between px-4 py-3 bg-navy-mid cursor-pointer"
                  onClick={() => toggleDay(day.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedDays.has(day.id)
                      ? <ChevronDown size={16} className="text-grey-muted" />
                      : <ChevronRight size={16} className="text-grey-muted" />}
                    <input
                      value={day.day_label}
                      onChange={e => { e.stopPropagation(); updateDayLabel(plan.id, day.id, e.target.value) }}
                      onClick={e => e.stopPropagation()}
                      className="bg-transparent text-white text-sm font-semibold focus:outline-none"
                      style={{ fontFamily: 'var(--font-label)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {loggingDayId !== day.id && day.exercises.length > 0 && !plan.id.startsWith('temp-') && (
                      <button
                        onClick={e => { e.stopPropagation(); startLogSession(day) }}
                        className="text-xs text-gold px-2 py-1 border border-gold/40 hover:bg-gold/10 transition-colors"
                        style={{ fontFamily: 'var(--font-label)' }}
                      >
                        Log Session
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteDay(plan.id, day.id) }}
                      className="text-grey-muted hover:text-white p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expandedDays.has(day.id) && (
                  <div className="p-4">
                    {day.exercises.length > 0 && loggingDayId === day.id ? (
                      // Log Session mode
                      <div className="mb-4">
                        <table className="w-full text-sm mb-4">
                          <thead>
                            <tr className="text-grey-muted border-b border-white/8">
                              <th className="text-left py-2 font-normal">Exercise</th>
                              <th className="text-left py-2 font-normal w-16">Sets</th>
                              <th className="text-left py-2 font-normal w-20">Reps</th>
                              <th className="text-left py-2 font-normal w-24">Last Weight</th>
                              <th className="text-left py-2 font-normal w-28">Weight Used (kg)</th>
                              <th className="text-left py-2 font-normal w-24">Reps Done</th>
                            </tr>
                          </thead>
                          <tbody>
                            {day.exercises.map(exercise => (
                              <tr key={exercise.id} className="border-b border-white/8">
                                <td className="py-2 text-white">{exercise.name}</td>
                                <td className="py-2 text-white/70">{exercise.sets}</td>
                                <td className="py-2 text-white/70">{exercise.reps}</td>
                                <td className="py-2">
                                  {localLastWeights[exercise.id] != null
                                    ? <span className="text-gold">{localLastWeights[exercise.id]}kg</span>
                                    : <span className="text-grey-muted text-xs">No history</span>}
                                </td>
                                <td className="py-2">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={sessionInputs[exercise.id]?.weight ?? ''}
                                    onChange={e => setSessionInputs(prev => ({
                                      ...prev,
                                      [exercise.id]: { ...prev[exercise.id], weight: e.target.value },
                                    }))}
                                    className="bg-navy-deep border border-white/20 text-white text-sm w-24 px-2 py-1 focus:outline-none focus:border-gold"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sessionInputs[exercise.id]?.reps ?? ''}
                                    onChange={e => setSessionInputs(prev => ({
                                      ...prev,
                                      [exercise.id]: { ...prev[exercise.id], reps: e.target.value },
                                    }))}
                                    className="bg-navy-deep border border-white/20 text-white text-sm w-20 px-2 py-1 focus:outline-none focus:border-gold"
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex items-center gap-3">
                          <Button size="sm" variant="primary" onClick={() => saveSession(clientId, day)} disabled={savingSession}>
                            {savingSession ? 'Saving...' : 'Save Session'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelLogSession}>Cancel</Button>
                          {sessionMsg && <span className="text-xs text-gold">{sessionMsg}</span>}
                        </div>
                      </div>
                    ) : day.exercises.length > 0 ? (
                      // Normal edit mode table
                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr className="text-grey-muted border-b border-white/8">
                            <th className="text-left py-2 font-normal">Exercise</th>
                            <th className="text-left py-2 font-normal w-16">Sets</th>
                            <th className="text-left py-2 font-normal w-20">Reps</th>
                            <th className="text-left py-2 font-normal w-20">Rest</th>
                            <th className="text-left py-2 font-normal">Notes</th>
                            <th className="text-left py-2 font-normal w-32">Video URL</th>
                            <th className="text-left py-2 font-normal w-24">Last Weight</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.exercises.map(exercise => (
                            <tr key={exercise.id} className="border-b border-white/8">
                              <td className="py-1.5">
                                <input
                                  value={exercise.name}
                                  onChange={e => updateExercise(plan.id, day.id, exercise.id, 'name', e.target.value)}
                                  className="bg-transparent text-white text-sm w-full focus:outline-none focus:border-b focus:border-gold/60 border-b border-transparent"
                                />
                              </td>
                              <td className="py-1.5 w-16">
                                <input
                                  value={exercise.sets}
                                  onChange={e => updateExercise(plan.id, day.id, exercise.id, 'sets', e.target.value)}
                                  className="bg-transparent text-white/85 text-sm w-12 focus:outline-none focus:border-b focus:border-gold/60 border-b border-transparent"
                                />
                              </td>
                              <td className="py-1.5 w-20">
                                <input
                                  value={exercise.reps}
                                  onChange={e => updateExercise(plan.id, day.id, exercise.id, 'reps', e.target.value)}
                                  className="bg-transparent text-white/85 text-sm w-16 focus:outline-none focus:border-b focus:border-gold/60 border-b border-transparent"
                                />
                              </td>
                              <td className="py-1.5 w-20">
                                <input
                                  value={exercise.rest_seconds ?? ''}
                                  onChange={e => updateExercise(plan.id, day.id, exercise.id, 'rest_seconds', e.target.value)}
                                  placeholder="—"
                                  className="bg-transparent text-white/85 text-sm w-16 focus:outline-none focus:border-b focus:border-gold/60 border-b border-transparent placeholder:text-white/30"
                                />
                              </td>
                              <td className="py-1.5">
                                <input
                                  value={exercise.notes ?? ''}
                                  onChange={e => updateExercise(plan.id, day.id, exercise.id, 'notes', e.target.value)}
                                  placeholder="—"
                                  className="bg-transparent text-grey-muted text-xs w-full focus:outline-none focus:border-b focus:border-gold/60 border-b border-transparent placeholder:text-white/20"
                                />
                              </td>
                              <td className="py-1.5 w-32">
                                <div className="flex items-center gap-1">
                                  <Video size={11} className="text-grey-muted flex-shrink-0" />
                                  <input
                                    value={exercise.video_url ?? ''}
                                    onChange={e => updateExercise(plan.id, day.id, exercise.id, 'video_url', e.target.value)}
                                    placeholder="https://..."
                                    className="bg-transparent text-grey-muted text-xs w-full focus:outline-none focus:border-b focus:border-gold/60 border-b border-transparent placeholder:text-white/20"
                                  />
                                </div>
                              </td>
                              <td className="py-1.5 w-24">
                                {localLastWeights[exercise.id] != null
                                  ? <span className="text-gold text-xs">{localLastWeights[exercise.id]}kg</span>
                                  : <span className="text-white/20 text-xs">—</span>}
                              </td>
                              <td className="py-1.5">
                                <button
                                  onClick={() => deleteExercise(plan.id, day.id, exercise.id)}
                                  className="text-grey-muted hover:text-white"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}

                    {loggingDayId !== day.id && (
                      addingExercise === day.id ? (
                        <div className="bg-navy-deep p-4 grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
                          <div className="col-span-2">
                            <Input
                              placeholder="Exercise name"
                              value={exerciseForm.name}
                              onChange={e => setExerciseForm(f => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <Input placeholder="Sets" value={exerciseForm.sets} onChange={e => setExerciseForm(f => ({ ...f, sets: e.target.value }))} />
                          <Input placeholder="Reps" value={exerciseForm.reps} onChange={e => setExerciseForm(f => ({ ...f, reps: e.target.value }))} />
                          <Input placeholder="Rest (s)" value={exerciseForm.rest_seconds} onChange={e => setExerciseForm(f => ({ ...f, rest_seconds: e.target.value }))} />
                          <Input placeholder="Notes" value={exerciseForm.notes} onChange={e => setExerciseForm(f => ({ ...f, notes: e.target.value }))} />
                          <div className="col-span-2 sm:col-span-6">
                            <Input placeholder="Video URL (optional)" value={exerciseForm.video_url} onChange={e => setExerciseForm(f => ({ ...f, video_url: e.target.value }))} />
                          </div>
                          <div className="col-span-2 sm:col-span-6 flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => addExercise(plan.id, day.id)}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingExercise(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingExercise(day.id)}
                          className="flex items-center gap-2 text-gold text-xs py-2"
                          style={{ fontFamily: 'var(--font-label)' }}
                        >
                          <Plus size={14} /> Add Exercise
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            <Button variant="ghost" size="sm" onClick={() => addDay(plan.id)} className="mt-1">
              + Add Day
            </Button>
          </div>
        </div>
      ))}

      {/* Import modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
              <div>
                <h3 className="text-white" style={{ fontFamily: 'var(--font-display)' }}>Import with AI</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs ${importStep === 'prompt' ? 'text-gold' : 'text-grey-muted'}`} style={{ fontFamily: 'var(--font-label)' }}>
                    1. COPY PROMPT
                  </span>
                  <span className="text-white/20 text-xs">→</span>
                  <span className={`text-xs ${importStep === 'paste' ? 'text-gold' : 'text-grey-muted'}`} style={{ fontFamily: 'var(--font-label)' }}>
                    2. PASTE RESPONSE
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setImportModalOpen(false); setImportText('') }}
                className="text-grey-muted hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 flex-1 overflow-y-auto">
              {importStep === 'prompt' ? (
                <>
                  <p className="text-grey-muted text-sm mb-4">
                    This prompt is built from the client&apos;s onboarding answers. Add any extra notes below, copy it into ChatGPT or any AI, then paste the response back.
                  </p>
                  {promptLoading ? (
                    <p className="text-grey-muted text-sm">Building prompt...</p>
                  ) : (
                    <pre className="w-full bg-navy-deep border border-white/12 text-white/85 p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed mb-4 max-h-48 overflow-y-auto">
                      {generatedPrompt}
                    </pre>
                  )}

                  <div className="mb-4">
                    <label className="text-xs text-grey-muted block mb-2" style={{ fontFamily: 'var(--font-label)' }}>
                      ADDITIONAL NOTES (OPTIONAL)
                    </label>
                    <textarea
                      value={extraContext}
                      onChange={e => setExtraContext(e.target.value)}
                      rows={3}
                      placeholder="e.g. Focus on running fitness. Include 2 tempo runs and 1 long run per week..."
                      className="w-full bg-navy-deep border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="primary" size="sm" onClick={handleCopyPrompt} disabled={promptLoading}>
                      {copied ? <><Check size={13} className="inline mr-1.5" />Copied!</> : <><Copy size={13} className="inline mr-1.5" />Copy Prompt</>}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setImportStep('paste')} disabled={promptLoading}>
                      Next: Paste Response →
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-grey-muted text-sm mb-4">
                    Paste the AI&apos;s response below. It will be parsed into the plan editor.
                  </p>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    rows={12}
                    className="w-full bg-navy-deep border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none mb-4"
                    placeholder="Paste the AI response here (JSON format expected)..."
                    autoFocus
                  />
                  {importError && <p className="text-red-400 text-xs mb-3">{importError}</p>}
                  <div className="flex gap-3">
                    <Button variant="primary" size="sm" onClick={handleParseResponse} disabled={importLoading || !importText.trim()}>
                      {importLoading ? 'Parsing...' : 'Parse & Import'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setImportStep('prompt'); setImportError('') }}>
                      ← Back
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
