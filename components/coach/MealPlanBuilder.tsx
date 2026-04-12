'use client'

import { useState } from 'react'
import { Trash2, Plus, Copy, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { MealPlan, Meal, MealItem } from '@/lib/types'

interface PlanDraft {
  day_type: string
  name: string
  times_per_week: number
  meals: Meal[]
}

interface MealPlanBuilderProps {
  clientId: string
  initialPlans: MealPlan[]
}

function getTotal(meals: Meal[]) {
  return meals.reduce((acc, meal) => {
    const mealTotal = meal.items.reduce((a, i) => ({
      calories: a.calories + i.calories,
      protein: a.protein + i.protein,
      carbs: a.carbs + i.carbs,
      fat: a.fat + i.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
    return {
      calories: acc.calories + mealTotal.calories,
      protein: acc.protein + mealTotal.protein,
      carbs: acc.carbs + mealTotal.carbs,
      fat: acc.fat + mealTotal.fat,
    }
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

function FreqPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6, 7].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-7 h-7 text-xs border transition-colors ${
            value === n
              ? 'bg-gold text-navy-deep border-gold font-semibold'
              : 'bg-navy-mid border-white/20 text-white/60 hover:border-white/40'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function MealEditor({ meals, onChange }: { meals: Meal[]; onChange: (meals: Meal[]) => void }) {
  const [addingMeal, setAddingMeal] = useState(false)
  const [newMealName, setNewMealName] = useState('')
  const [addingItem, setAddingItem] = useState<number | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', description: '', calories: '', protein: '', carbs: '', fat: '', ingredients: '' })
  const [suggestingIngredients, setSuggestingIngredients] = useState(false)

  function addMeal() {
    if (!newMealName.trim()) return
    onChange([...meals, { name: newMealName.trim(), items: [] }])
    setNewMealName('')
    setAddingMeal(false)
  }

  function deleteMeal(index: number) {
    onChange(meals.filter((_, i) => i !== index))
  }

  async function suggestIngredients() {
    if (!itemForm.name.trim() || suggestingIngredients) return
    setSuggestingIngredients(true)
    try {
      const res = await fetch('/api/ai/suggest-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealName: itemForm.name, description: itemForm.description }),
      })
      if (res.ok) {
        const data = await res.json()
        setItemForm(f => ({ ...f, ingredients: (data.ingredients as string[]).join('\n') }))
      }
    } finally {
      setSuggestingIngredients(false)
    }
  }

  function addItem(mealIndex: number) {
    const item: MealItem = {
      name: itemForm.name,
      description: itemForm.description,
      calories: parseInt(itemForm.calories) || 0,
      protein: parseInt(itemForm.protein) || 0,
      carbs: parseInt(itemForm.carbs) || 0,
      fat: parseInt(itemForm.fat) || 0,
      ingredients: itemForm.ingredients.split('\n').map(l => l.trim()).filter(l => l.length > 0),
    }
    onChange(meals.map((m, i) => i === mealIndex ? { ...m, items: [...m.items, item] } : m))
    setItemForm({ name: '', description: '', calories: '', protein: '', carbs: '', fat: '', ingredients: '' })
    setAddingItem(null)
  }

  function deleteItem(mealIndex: number, itemIndex: number) {
    onChange(meals.map((m, i) => i === mealIndex ? { ...m, items: m.items.filter((_, j) => j !== itemIndex) } : m))
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{item.name}</p>
                  {item.description && <p className="text-xs text-grey-muted">{item.description}</p>}
                  <p className="text-xs text-grey-muted mt-0.5">
                    {item.calories} kcal &middot; {item.protein}g protein &middot; {item.carbs}g carbs &middot; {item.fat}g fat
                  </p>
                  {item.ingredients && item.ingredients.length > 0 && (
                    <p className="text-xs text-white/30 mt-1 leading-relaxed">
                      {item.ingredients.join(' · ')}
                    </p>
                  )}
                </div>
                <button onClick={() => deleteItem(mealIndex, itemIndex)} className="text-grey-muted hover:text-white ml-4 mt-1 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {addingItem === mealIndex ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Input placeholder="Food name (e.g. Turkey &amp; Avocado Wrap)" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-span-3">
                  <Input placeholder="Amount/description (e.g. 200g cooked)" value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <Input placeholder="Calories" type="number" value={itemForm.calories} onChange={e => setItemForm(f => ({ ...f, calories: e.target.value }))} />
                <Input placeholder="Protein (g)" type="number" value={itemForm.protein} onChange={e => setItemForm(f => ({ ...f, protein: e.target.value }))} />
                <Input placeholder="Carbs (g)" type="number" value={itemForm.carbs} onChange={e => setItemForm(f => ({ ...f, carbs: e.target.value }))} />
                <Input placeholder="Fat (g)" type="number" value={itemForm.fat} onChange={e => setItemForm(f => ({ ...f, fat: e.target.value }))} />
                <div className="col-span-3 mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-label)', letterSpacing: '0.5px' }}>
                      SHOPPING LIST INGREDIENTS
                    </span>
                    <button
                      type="button"
                      onClick={suggestIngredients}
                      disabled={suggestingIngredients || !itemForm.name.trim()}
                      className="flex items-center gap-1 text-xs text-gold/70 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sparkles size={11} />
                      {suggestingIngredients ? 'Suggesting…' : 'Suggest'}
                    </button>
                  </div>
                  <textarea
                    value={itemForm.ingredients}
                    onChange={e => setItemForm(f => ({ ...f, ingredients: e.target.value }))}
                    rows={4}
                    placeholder={'One ingredient per line:\n100g sliced turkey breast\n1/4 avocado\nlettuce'}
                    className="w-full bg-navy-deep border border-white/20 text-white/85 px-3 py-2 text-xs focus:outline-none focus:border-gold resize-none placeholder:text-white/20 leading-relaxed"
                  />
                </div>
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
          <Input
            placeholder="Meal name (e.g. Breakfast)"
            value={newMealName}
            onChange={e => setNewMealName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMeal()}
            className="flex-1"
          />
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

      <div className="mt-4 pt-3 border-t border-white/8 text-xs text-grey-muted flex items-center gap-3 flex-wrap">
        <span>Total:</span>
        <span><span className="text-white font-semibold">{total.calories}</span> kcal</span>
        <span className="text-white/20">&middot;</span>
        <span>P <span className="text-white font-semibold">{total.protein}g</span></span>
        <span className="text-white/20">&middot;</span>
        <span>C <span className="text-white font-semibold">{total.carbs}g</span></span>
        <span className="text-white/20">&middot;</span>
        <span>F <span className="text-white font-semibold">{total.fat}g</span></span>
      </div>
    </div>
  )
}

export function MealPlanBuilder({ clientId, initialPlans }: MealPlanBuilderProps) {
  const [plans, setPlans] = useState<PlanDraft[]>(
    initialPlans.map(p => ({
      day_type: p.day_type,
      name: p.name,
      times_per_week: p.times_per_week ?? 1,
      meals: p.meals,
    }))
  )
  const [activeTab, setActiveTab] = useState<string>(initialPlans[0]?.day_type ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // New plan form
  const [addingPlan, setAddingPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanFreq, setNewPlanFreq] = useState(7)

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStep, setImportStep] = useState<'prompt' | 'paste'>('prompt')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  const activePlan = plans.find(p => p.day_type === activeTab)

  function updateActiveMeals(meals: Meal[]) {
    setPlans(prev => prev.map(p => p.day_type === activeTab ? { ...p, meals } : p))
  }

  function addNewPlan() {
    if (!newPlanName.trim()) return
    const day_type = newPlanName.trim()
    if (plans.some(p => p.day_type === day_type)) return
    setPlans(prev => [...prev, { day_type, name: day_type, times_per_week: newPlanFreq, meals: [] }])
    setActiveTab(day_type)
    setAddingPlan(false)
    setNewPlanName('')
    setNewPlanFreq(7)
  }

  async function deletePlan(day_type: string) {
    await fetch(`/api/meal-plan/${clientId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_type }),
    })
    const remaining = plans.filter(p => p.day_type !== day_type)
    setPlans(remaining)
    if (activeTab === day_type) setActiveTab(remaining[0]?.day_type ?? '')
  }

  function loadMealPlanData(data: { training_day: { meals: Meal[] }; rest_day: { meals: Meal[] } }) {
    setPlans(prev => {
      const updated = [...prev]
      const ti = updated.findIndex(p => p.day_type === 'training' || p.day_type === 'Training Day')
      const ri = updated.findIndex(p => p.day_type === 'rest' || p.day_type === 'Rest Day')
      if (ti >= 0) {
        updated[ti] = { ...updated[ti], meals: data.training_day.meals }
      } else {
        updated.push({ day_type: 'Training Day', name: 'Training Day', times_per_week: 4, meals: data.training_day.meals })
      }
      if (ri >= 0) {
        updated[ri] = { ...updated[ri], meals: data.rest_day.meals }
      } else {
        updated.push({ day_type: 'Rest Day', name: 'Rest Day', times_per_week: 3, meals: data.rest_day.meals })
      }
      return updated
    })
    setActiveTab(prev => prev || 'Training Day')
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

Primary goals: ${r.primary_goals || 'Not specified'}
Weight: ${r.weight_kg || '?'}kg | Age: ${r.age || '?'} | Height: ${r.height || 'Not specified'}
Meals per day: ${r.meals_per_day || 'Not specified'}
Food allergies / intolerances: ${r.food_allergies || 'None'}
Foods to avoid: ${r.foods_avoided || 'None'}
Foods to include: ${r.foods_wanted || 'Not specified'}
Meal prep time: ${r.meal_prep_time || 'Not specified'}
Medical conditions: ${r.medical_conditions || 'None'}

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
      await Promise.all(plans.map(plan =>
        fetch(`/api/meal-plan/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_type: plan.day_type,
            name: plan.name,
            meals: plan.meals,
            is_active: true,
            times_per_week: plan.times_per_week,
          }),
        })
      ))
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
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || plans.length === 0}>
            {saving ? 'Saving...' : 'Save Meal Plan'}
          </Button>
        </div>
      </div>
      <GoldRule />

      {plans.length === 0 ? (
        <p className="text-grey-muted text-sm mt-4">No day types yet. Add one below.</p>
      ) : (
        <div className="flex gap-4 mt-4 mb-2 border-b border-white/8 overflow-x-auto scrollbar-none">
          {plans.map(plan => (
            <button
              key={plan.day_type}
              onClick={() => setActiveTab(plan.day_type)}
              className={`pb-3 text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === plan.day_type ? 'text-gold border-b-2 border-gold' : 'text-grey-muted hover:text-white'
              }`}
              style={{ fontFamily: 'var(--font-label)' }}
            >
              {plan.name}
              <span className="ml-1.5 text-xs opacity-50">{plan.times_per_week}×/wk</span>
            </button>
          ))}
        </div>
      )}

      {plans.length > 0 && (() => {
        const total = plans.reduce((s, p) => s + p.times_per_week, 0)
        return (
          <p className={`text-xs mt-2 mb-1 ${total === 7 ? 'text-gold/60' : 'text-orange-400'}`} style={{ fontFamily: 'var(--font-label)' }}>
            {total}/7 days per week{total < 7 ? ' — shopping list will be under a full week' : total > 7 ? ' — over 7 days' : ' ✓'}
          </p>
        )
      })()}

      {message && <p className="text-gold text-sm mt-3 mb-2">{message}</p>}

      {activePlan && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-label)' }}>DAYS/WEEK</span>
              <FreqPicker
                value={activePlan.times_per_week}
                onChange={n => setPlans(prev => prev.map(p => p.day_type === activeTab ? { ...p, times_per_week: n } : p))}
              />
            </div>
            <button
              onClick={() => deletePlan(activeTab)}
              className="text-xs text-grey-muted hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> Delete day type
            </button>
          </div>
          <MealEditor meals={activePlan.meals} onChange={updateActiveMeals} />
        </div>
      )}

      {/* Add day type */}
      <div className="mt-5 pt-4 border-t border-white/8">
        {addingPlan ? (
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Day name (e.g. High Carb Day)"
              value={newPlanName}
              onChange={e => setNewPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNewPlan()}
              className="flex-1 min-w-40"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-label)' }}>DAYS/WK</span>
              <FreqPicker value={newPlanFreq} onChange={setNewPlanFreq} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={addNewPlan}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingPlan(false); setNewPlanName('') }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingPlan(true)}
            className="flex items-center gap-1.5 text-gold text-xs"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            <Plus size={14} /> Add Day Type
          </button>
        )}
      </div>

      {/* Import modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-white/8 w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
              <div>
                <h3 className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Import with AI
                </h3>
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
                    Paste the AI&apos;s response below. Training day and rest day meal plans will be loaded into the editor.
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
