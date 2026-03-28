'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, ChevronRight, Plus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Programme, ProgrammeDay, Exercise } from '@/lib/types'

interface ProgrammeEditorProps {
  clientId: string
  initialProgramme: Programme | null
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
  name: '',
  sets: '',
  reps: '',
  rest_seconds: '',
  video_url: '',
  notes: '',
}

export function ProgrammeEditor({ clientId, initialProgramme }: ProgrammeEditorProps) {
  const router = useRouter()
  const [programme, setProgramme] = useState<Programme | null>(initialProgramme)
  const [programmeName, setProgrammeName] = useState(initialProgramme?.name || '')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [addingExercise, setAddingExercise] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormData>(emptyExerciseForm)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStep, setImportStep] = useState<'prompt' | 'paste'>('prompt')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function toggleDay(dayId: string) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayId)) next.delete(dayId)
      else next.add(dayId)
      return next
    })
  }

  function addDay() {
    const newDay: ProgrammeDay = {
      id: `new-day-${Date.now()}`,
      programme_id: '',
      day_number: (programme?.days.length || 0) + 1,
      day_label: `Day ${(programme?.days.length || 0) + 1}`,
      sort_order: (programme?.days.length || 0) + 1,
      exercises: [],
    }
    if (!programme) {
      const created: Programme = {
        id: '',
        client_id: clientId,
        name: programmeName || 'New Programme',
        is_active: true,
        created_at: new Date().toISOString(),
        days: [newDay],
      }
      setProgramme(created)
      setExpandedDays(new Set([newDay.id]))
      return
    }
    setProgramme({ ...programme, days: [...programme.days, { ...newDay, programme_id: programme.id }] })
  }

  function updateDayLabel(dayId: string, label: string) {
    if (!programme) return
    setProgramme({
      ...programme,
      days: programme.days.map(d => d.id === dayId ? { ...d, day_label: label } : d),
    })
  }

  function deleteDay(dayId: string) {
    if (!programme) return
    setProgramme({ ...programme, days: programme.days.filter(d => d.id !== dayId) })
  }

  function addExercise(dayId: string) {
    if (!programme || !exerciseForm.name) return
    const exercise: Exercise = {
      id: `new-ex-${Date.now()}`,
      day_id: dayId,
      name: exerciseForm.name,
      sets: parseInt(exerciseForm.sets) || 3,
      reps: exerciseForm.reps || '10',
      rest_seconds: exerciseForm.rest_seconds ? parseInt(exerciseForm.rest_seconds) : null,
      video_url: exerciseForm.video_url || null,
      notes: exerciseForm.notes || null,
      sort_order: (programme.days.find(d => d.id === dayId)?.exercises.length || 0) + 1,
    }
    setProgramme({
      ...programme,
      days: programme.days.map(d =>
        d.id === dayId ? { ...d, exercises: [...d.exercises, exercise] } : d
      ),
    })
    setExerciseForm(emptyExerciseForm)
    setAddingExercise(null)
  }

  function deleteExercise(dayId: string, exerciseId: string) {
    if (!programme) return
    setProgramme({
      ...programme,
      days: programme.days.map(d =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
          : d
      ),
    })
  }

  function loadProgrammeData(data: { name: string; days: { day_label: string; exercises: { name: string; sets: number; reps: string; rest_seconds: number | null; notes: string | null }[] }[] }, prefix: string) {
    setProgrammeName(data.name)
    setProgramme({
      id: programme?.id || '',
      client_id: clientId,
      name: data.name,
      is_active: true,
      created_at: new Date().toISOString(),
      days: data.days.map((d, i) => ({
        id: `${prefix}-day-${i}`,
        programme_id: '',
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
    })
  }

  async function openImportModal() {
    setImportModalOpen(true)
    setImportStep('prompt')
    setImportText('')
    setCopied(false)
    setPromptLoading(true)

    try {
      const res = await fetch(`/api/onboarding/${clientId}`)
      const data = await res.json()
      const r: Record<string, string> = data?.responses || {}

      const prompt = `You are a professional fitness coach. Create a detailed training programme for a client with the following profile:

Goal: ${r.goal || 'Not specified'}
Current weight: ${r.current_weight || '?'}kg | Goal weight: ${r.goal_weight || '?'}kg
Age: ${r.age || '?'} | Height: ${r.height || '?'}cm
Activity level: ${r.activity_level || 'Not specified'}
Training experience: ${r.training_experience || 'Not specified'}
Training days per week: ${r.training_days || '3'}
Equipment available: ${r.equipment || 'Not specified'}
Injuries / limitations: ${r.injuries || 'None'}
Daily schedule: ${r.daily_schedule || 'Not specified'}
What has/hasn't worked before: ${r.what_worked || 'Not specified'}

Create a ${r.training_days || '3'}-day training programme tailored to this client. Return ONLY valid JSON in this exact format with no other text:

{"name":"string","days":[{"day_label":"string","exercises":[{"name":"string","sets":number,"reps":"string","rest_seconds":number|null,"notes":"string|null"}]}]}`

      setGeneratedPrompt(prompt)
    } catch {
      setGeneratedPrompt('Failed to load onboarding data. Please ensure the client has completed onboarding.')
    }

    setPromptLoading(false)
  }

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(generatedPrompt)
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
        loadProgrammeData(data, 'imported')
        setImportModalOpen(false)
        setImportText('')
        setImportError('')
      }
    } catch {
      setImportError('Unexpected error. Please try again.')
    }
    setImportLoading(false)
  }

  async function handleSave() {
    if (!programme) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          name: programmeName || 'Training Programme',
          days: programme.days.map(d => ({
            day_label: d.day_label,
            exercises: d.exercises.map(e => ({
              name: e.name,
              sets: e.sets,
              reps: e.reps,
              rest_seconds: e.rest_seconds,
              notes: e.notes,
            })),
          })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('Programme saved.')
        setTimeout(() => setMessage(''), 3000)
        router.refresh()
      } else {
        setMessage(`Error: ${data.error || 'Failed to save.'}`)
      }
    } catch {
      setMessage('Network error — programme not saved.')
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <input
          value={programmeName}
          onChange={e => setProgrammeName(e.target.value)}
          placeholder="Programme name..."
          className="bg-transparent text-white text-xl border-b border-white/20 focus:border-gold focus:outline-none pb-1 w-64"
          style={{ fontFamily: 'var(--font-display)' }}
        />
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={openImportModal}>
            Import with AI
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Programme'}
          </Button>
        </div>
      </div>

      {message && <p className="text-gold text-sm mb-4">{message}</p>}

      {/* Days */}
      {programme?.days.map((day) => (
        <div key={day.id} className="mb-3 border border-white/8">
          <div
            className="flex items-center justify-between px-4 py-3 bg-navy-mid cursor-pointer"
            onClick={() => toggleDay(day.id)}
          >
            <div className="flex items-center gap-3">
              {expandedDays.has(day.id) ? <ChevronDown size={16} className="text-grey-muted" /> : <ChevronRight size={16} className="text-grey-muted" />}
              <input
                value={day.day_label}
                onChange={e => { e.stopPropagation(); updateDayLabel(day.id, e.target.value) }}
                onClick={e => e.stopPropagation()}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none"
                style={{ fontFamily: 'var(--font-label)' }}
              />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteDay(day.id) }}
              className="text-grey-muted hover:text-white p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {expandedDays.has(day.id) && (
            <div className="p-4">
              {day.exercises.length > 0 && (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="text-grey-muted border-b border-white/8">
                      <th className="text-left py-2 font-normal">Exercise</th>
                      <th className="text-left py-2 font-normal w-16">Sets</th>
                      <th className="text-left py-2 font-normal w-20">Reps</th>
                      <th className="text-left py-2 font-normal w-20">Rest</th>
                      <th className="text-left py-2 font-normal">Notes</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.exercises.map((exercise) => (
                      <tr key={exercise.id} className="border-b border-white/8">
                        <td className="py-2.5 text-white">{exercise.name}</td>
                        <td className="py-2.5 text-white/85">{exercise.sets}</td>
                        <td className="py-2.5 text-white/85">{exercise.reps}</td>
                        <td className="py-2.5 text-white/85">
                          {exercise.rest_seconds ? `${exercise.rest_seconds}s` : '—'}
                        </td>
                        <td className="py-2.5 text-grey-muted text-xs">{exercise.notes || '—'}</td>
                        <td className="py-2.5">
                          <button
                            onClick={() => deleteExercise(day.id, exercise.id)}
                            className="text-grey-muted hover:text-white"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {addingExercise === day.id ? (
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
                  <div className="col-span-2 sm:col-span-6 flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => addExercise(day.id)}>Add</Button>
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
              )}
            </div>
          )}
        </div>
      ))}

      <Button variant="ghost" size="sm" onClick={addDay} className="mt-2">
        + Add Day
      </Button>

      {/* Import modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
              <div>
                <h3 className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Import with AI
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs ${importStep === 'prompt' ? 'text-gold' : 'text-grey-muted'}`}
                    style={{ fontFamily: 'var(--font-label)' }}>
                    1. COPY PROMPT
                  </span>
                  <span className="text-white/20 text-xs">→</span>
                  <span className={`text-xs ${importStep === 'paste' ? 'text-gold' : 'text-grey-muted'}`}
                    style={{ fontFamily: 'var(--font-label)' }}>
                    2. PASTE RESPONSE
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setImportModalOpen(false); setImportText('') }}
                className="text-grey-muted hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 flex-1 overflow-y-auto">
              {importStep === 'prompt' ? (
                <>
                  <p className="text-grey-muted text-sm mb-4">
                    This prompt has been built from the client&apos;s onboarding answers. Copy it, paste it into ChatGPT or any AI, then come back and paste the response.
                  </p>
                  {promptLoading ? (
                    <p className="text-grey-muted text-sm">Building prompt...</p>
                  ) : (
                    <pre className="w-full bg-navy-deep border border-white/12 text-white/85 p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed mb-4 max-h-72 overflow-y-auto">
                      {generatedPrompt}
                    </pre>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCopyPrompt}
                      disabled={promptLoading}
                    >
                      {copied ? <><Check size={13} className="inline mr-1.5" />Copied!</> : <><Copy size={13} className="inline mr-1.5" />Copy Prompt</>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportStep('paste')}
                      disabled={promptLoading}
                    >
                      Next: Paste Response →
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-grey-muted text-sm mb-4">
                    Paste the AI&apos;s response below. It will be parsed into the programme editor.
                  </p>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    rows={12}
                    className="w-full bg-navy-deep border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none mb-4"
                    placeholder='Paste the AI response here (JSON format expected)...'
                    autoFocus
                  />
                  {importError && (
                    <p className="text-red-400 text-xs mb-3">{importError}</p>
                  )}
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
