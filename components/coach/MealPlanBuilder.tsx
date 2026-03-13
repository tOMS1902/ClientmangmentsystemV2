'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
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
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Meal Plan'}
        </Button>
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
    </div>
  )
}
