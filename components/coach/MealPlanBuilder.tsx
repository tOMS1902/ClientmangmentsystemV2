'use client'

import { useState } from 'react'
import { Trash2, Plus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { MealPlan, Meal, MealItem } from '@/lib/types'

interface MealPlanBuilderProps {
  clientId: string
  initialTrainingPlan: MealPlan | null
  initialRestPlan: MealPlan | null
}

function getTotal(meals: Meal[]) {
  return meals.reduce((acc, meal) => {
    const mealTotal = meal.items.reduce((a, i) => ({
      calories: a.calories + i.calories,
      protein: a.protein + i.protein,
    }), { calories: 0, protein: 0 })
    return { calories: acc.calories + mealTotal.calories, protein: acc.protein + mealTotal.protein }
  }, { calories: 0, protein: 0 })
}

function MealEditor({
  meals,
  onChange,
}: {
  meals: Meal[]
  onChange: (meals: Meal[]) => void
}) {
  const [addingMeal, setAddingMeal] = useState(false)
  const [newMealName, setNewMealName] = useState('')
  const [addingItem, setAddingItem] = useState<number | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', description: '', calories: '', protein: '', carbs: '', fat: '' })

  function addMeal() {
    if (!newMealName.trim()) return
    onChange([...meals, { name: newMealName.trim(), items: [] }])
    setNewMealName('')
    setAddingMeal(false)
  }

  function deleteMeal(index: number) {
    onChange(meals.filter((_, i) => i !== index))
  }

  function addItem(mealIndex: number) {
    const item: MealItem = {
      name: itemForm.name,
      description: itemForm.description,
      calories: parseInt(itemForm.calories) || 0,
      protein: parseInt(itemForm.protein) || 0,
      carbs: parseInt(itemForm.carbs) || 0,
      fat: parseInt(itemForm.fat) || 0,
    }
    const updated = meals.map((m, i) =>
      i === mealIndex ? { ...m, items: [...m.items, item] } : m
    )
    onChange(updated)
    setItemForm({ name: '', description: '', calories: '', protein: '', carbs: '', fat: '' })
    setAddingItem(null)
  }

  function deleteItem(mealIndex: number, itemIndex: number) {
    const updated = meals.map((m, i) =>
      i === mealIndex ? { ...m, items: m.items.filter((_, j) => j !== itemIndex) } : m
    )
    onChange(updated)
  }

  const total = getTotal(meals)

  return (
    <div>
      {meals.map((meal, mealIndex) => (
        <div key={mealIndex} className="mb-4 border border-white/8">
          <div className="flex items-center justify-between px-4 py-2.5 bg-navy-mid">
            <span className="text-sm text-white" style={{ fontFamily: 'var(--font-label)' }}>{meal.name}</span>
            <button onClick={() => deleteMeal(mealIndex)} className="text-grey-muted hover:text-white">
              <Trash2 size={13} />
            </button>
          </div>
          <div className="p-4">
            {meal.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-start justify-between py-2 border-b border-white/8 last:border-0">
                <div>
                  <p className="text-sm text-white">{item.name}</p>
                  {item.description && <p className="text-xs text-grey-muted">{item.description}</p>}
                  <p className="text-xs text-grey-muted mt-0.5">
                    {item.calories} kcal &middot; {item.protein}g protein &middot; {item.carbs}g carbs &middot; {item.fat}g fat
                  </p>
                </div>
                <button onClick={() => deleteItem(mealIndex, itemIndex)} className="text-grey-muted hover:text-white ml-4 mt-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {addingItem === mealIndex ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Input placeholder="Food name" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-span-3">
                  <Input placeholder="Description (e.g. 200g cooked)" value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <Input placeholder="Calories" type="number" value={itemForm.calories} onChange={e => setItemForm(f => ({ ...f, calories: e.target.value }))} />
                <Input placeholder="Protein (g)" type="number" value={itemForm.protein} onChange={e => setItemForm(f => ({ ...f, protein: e.target.value }))} />
                <Input placeholder="Carbs (g)" type="number" value={itemForm.carbs} onChange={e => setItemForm(f => ({ ...f, carbs: e.target.value }))} />
                <Input placeholder="Fat (g)" type="number" value={itemForm.fat} onChange={e => setItemForm(f => ({ ...f, fat: e.target.value }))} />
                <div className="col-span-3 flex gap-2 mt-1">
                  <Button size="sm" variant="primary" onClick={() => addItem(mealIndex)}>Add Item</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingItem(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingItem(mealIndex)}
                className="flex items-center gap-1.5 text-gold text-xs mt-2"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                <Plus size={12} /> Add Item
              </button>
            )}
          </div>
        </div>
      ))}

      {addingMeal ? (
        <div className="flex gap-2 items-center mt-2">
          <Input placeholder="Meal name (e.g. Breakfast)" value={newMealName} onChange={e => setNewMealName(e.target.value)} className="flex-1" />
          <Button size="sm" variant="primary" onClick={addMeal}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingMeal(false)}>Cancel</Button>
        </div>
      ) : (
        <button
          onClick={() => setAddingMeal(true)}
          className="flex items-center gap-1.5 text-gold text-xs mt-2"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          <Plus size={14} /> Add Meal
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-white/8">
        <p className="text-sm text-grey-muted">
          Plan total: <span className="text-white font-semibold">{total.calories} kcal</span> &middot; <span className="text-white font-semibold">{total.protein}g protein</span>
        </p>
      </div>
    </div>
  )
}

export function MealPlanBuilder({ clientId, initialTrainingPlan, initialRestPlan }: MealPlanBuilderProps) {
  const [activeTab, setActiveTab] = useState<'training' | 'rest'>('training')
  const [trainingMeals, setTrainingMeals] = useState<Meal[]>(initialTrainingPlan?.meals || [])
  const [restMeals, setRestMeals] = useState<Meal[]>(initialRestPlan?.meals || [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStep, setImportStep] = useState<'prompt' | 'paste'>('prompt')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  function loadMealPlanData(data: { training_day: { meals: Meal[] }; rest_day: { meals: Meal[] } }) {
    setTrainingMeals(data.training_day.meals || [])
    setRestMeals(data.rest_day.meals || [])
  }

  async function openImportModal() {
    setImportModalOpen(true)
    setImportStep('prompt')
    setImportText('')
    setCopied(false)
    setPromptLoading(true)

    try {
      const [onboardingRes, targetsRes] = await Promise.all([
        fetch(`/api/onboarding/${clientId}`),
        fetch(`/api/nutrition-targets?clientId=${clientId}`),
      ])
      const onboardingData = onboardingRes.ok ? await onboardingRes.json() : {}
      const targetsData = targetsRes.ok ? await targetsRes.json() : {}
      const r: Record<string, string> = onboardingData?.responses || {}
      const t = targetsData || {}

      const prompt = `You are a professional nutrition coach. Create a detailed meal plan for a client with the following profile:

Goal: ${r.goal || 'Not specified'}
Current weight: ${r.current_weight || '?'}kg | Goal weight: ${r.goal_weight || '?'}kg
Age: ${r.age || '?'} | Height: ${r.height || '?'}cm
Activity level: ${r.activity_level || 'Not specified'}
Dietary preferences: ${r.dietary_preferences || 'None specified'}
Injuries / limitations: ${r.injuries || 'None'}

Nutrition targets:
Training day: ${t.td_calories || '?'} kcal | ${t.td_protein || '?'}g protein | ${t.td_carbs || '?'}g carbs | ${t.td_fat || '?'}g fat
Rest day: ${t.ntd_calories || '?'} kcal | ${t.ntd_protein || '?'}g protein | ${t.ntd_carbs || '?'}g carbs | ${t.ntd_fat || '?'}g fat

Create both a training day meal plan and a rest day meal plan that hit these macronutrient targets. Return ONLY valid JSON in this exact format with no other text:

{"training_day":{"meals":[{"name":"string","items":[{"name":"string","description":"string","calories":number,"protein":number,"carbs":number,"fat":number}]}]},"rest_day":{"meals":[{"name":"string","items":[{"name":"string","description":"string","calories":number,"protein":number,"carbs":number,"fat":number}]}]}}`

      setGeneratedPrompt(prompt)
    } catch {
      setGeneratedPrompt('Failed to load client data. Please ensure the client has completed onboarding and has nutrition targets set.')
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
      const res = await fetch('/api/ai/import-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error || 'Failed to parse response.')
      } else if (data.training_day && data.rest_day) {
        loadMealPlanData(data)
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
    setSaving(true)
    try {
      await Promise.all([
        fetch(`/api/meal-plan/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_type: 'training', name: 'Training Day', meals: trainingMeals, is_active: true }),
        }),
        fetch(`/api/meal-plan/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_type: 'rest', name: 'Rest Day', meals: restMeals, is_active: true }),
        }),
      ])
      setMessage('Meal plan saved.')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Error saving meal plan.')
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Meal Plan</Eyebrow>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={openImportModal}>
            Import with AI
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Meal Plan'}
          </Button>
        </div>
      </div>
      <GoldRule />

      <div className="flex gap-4 mt-4 mb-6 border-b border-white/8">
        {(['training', 'rest'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm capitalize transition-colors ${activeTab === tab ? 'text-gold border-b-2 border-gold' : 'text-grey-muted hover:text-white'}`}
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {tab === 'training' ? 'Training Day' : 'Rest Day'}
          </button>
        ))}
      </div>

      {message && <p className="text-gold text-sm mb-3">{message}</p>}

      {activeTab === 'training' ? (
        <MealEditor meals={trainingMeals} onChange={setTrainingMeals} />
      ) : (
        <MealEditor meals={restMeals} onChange={setRestMeals} />
      )}

      {/* Import modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
              <div>
                <h3 className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Import with AI
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`text-xs ${importStep === 'prompt' ? 'text-gold' : 'text-grey-muted'}`}
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    1. COPY PROMPT
                  </span>
                  <span className="text-white/20 text-xs">→</span>
                  <span
                    className={`text-xs ${importStep === 'paste' ? 'text-gold' : 'text-grey-muted'}`}
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
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
                    This prompt is built from the client&apos;s profile and nutrition targets. Copy it, paste into ChatGPT or any AI, then come back and paste the response.
                  </p>
                  {promptLoading ? (
                    <p className="text-grey-muted text-sm">Building prompt...</p>
                  ) : (
                    <pre className="w-full bg-navy-deep border border-white/12 text-white/85 p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed mb-4 max-h-72 overflow-y-auto">
                      {generatedPrompt}
                    </pre>
                  )}
                  <div className="flex gap-3">
                    <Button variant="primary" size="sm" onClick={handleCopyPrompt} disabled={promptLoading}>
                      {copied
                        ? <><Check size={13} className="inline mr-1.5" />Copied!</>
                        : <><Copy size={13} className="inline mr-1.5" />Copy Prompt</>
                      }
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setImportStep('paste')} disabled={promptLoading}>
                      Next: Paste Response →
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-grey-muted text-sm mb-4">
                    Paste the AI&apos;s response below. Both training day and rest day meal plans will be loaded into the editor.
                  </p>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    rows={12}
                    className="w-full bg-navy-deep border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none mb-4"
                    placeholder="Paste the AI response here (JSON format expected)..."
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
