'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import type { MealPlan, Meal } from '@/lib/types'

function MealCard({ meal }: { meal: Meal }) {
  const totalCals = meal.items.reduce((a, i) => a + i.calories, 0)
  const totalProtein = meal.items.reduce((a, i) => a + i.protein, 0)

  return (
    <div className="bg-navy-card border border-white/8 mb-4">
      <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
        <span className="text-sm text-white font-semibold" style={{ fontFamily: 'var(--font-label)' }}>
          {meal.name}
        </span>
        <span className="text-xs text-grey-muted">{totalCals} kcal · {totalProtein}g P</span>
      </div>
      <div className="p-5">
        {meal.items.map((item, i) => (
          <div key={i} className={`py-3 ${i < meal.items.length - 1 ? 'border-b border-white/8' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white">{item.name}</p>
                {item.description && <p className="text-xs text-grey-muted">{item.description}</p>}
              </div>
              <p className="text-xs text-grey-muted ml-4 flex-shrink-0">
                {item.calories} kcal
              </p>
            </div>
            <p className="text-xs text-grey-muted mt-1">
              P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MealsPage() {
  const [trainingPlan, setTrainingPlan] = useState<MealPlan | null>(null)
  const [restPlan, setRestPlan] = useState<MealPlan | null>(null)
  const [activeTab, setActiveTab] = useState<'training' | 'rest'>('training')
  const [loading, setLoading] = useState(true)
  const [extraCalories, setExtraCalories] = useState('')
  const [savedExtra, setSavedExtra] = useState(false)
  const [savingExtra, setSavingExtra] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const clientRes = await fetch('/api/clients/me')
        if (clientRes.ok) {
          const client = await clientRes.json()
          const mealRes = await fetch(`/api/meal-plan/${client.id}`)
          if (mealRes.ok) {
            const data = await mealRes.json()
            setTrainingPlan(data.training)
            setRestPlan(data.rest)
          }
        }
      } catch {
        // no meal plan
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveExtra() {
    if (!extraCalories) return
    setSavingExtra(true)
    await fetch('/api/logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calories: parseInt(extraCalories) }),
    })
    setSavingExtra(false)
    setSavedExtra(true)
  }

  const activePlan = activeTab === 'training' ? trainingPlan : restPlan

  const planTotal = activePlan?.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.items.reduce((a, i) => a + i.calories, 0),
    protein: acc.protein + meal.items.reduce((a, i) => a + i.protein, 0),
  }), { calories: 0, protein: 0 }) || { calories: 0, protein: 0 }

  if (loading) return <div className="text-grey-muted">Loading meals...</div>

  return (
    <div>
      <div className="mb-6">
        <Eyebrow>Today's Meal Plan</Eyebrow>
        <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          Meals
        </h1>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-4 mb-6 border-b border-white/8">
        {(['training', 'rest'] as const).map(tab => (
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

      {!activePlan ? (
        <p className="text-grey-muted">No meal plan set for this day type yet.</p>
      ) : (
        <div>
          {activePlan.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}

          <div className="mt-4 p-4 border-t border-white/8">
            <p className="text-sm text-grey-muted">
              Plan total: <span className="text-white font-semibold">{planTotal.calories} kcal</span> · <span className="text-white font-semibold">{planTotal.protein}g protein</span>
            </p>
          </div>
        </div>
      )}

      {/* Additional calories */}
      <div className="bg-navy-card border border-white/8 p-6 mt-8">
        <Eyebrow>Additional Calories</Eyebrow>
        <GoldRule />
        <p className="text-sm text-grey-muted mt-3 mb-4">Any extra food not in your plan?</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-white/85 block mb-1">Extra calories</label>
            <input
              type="number"
              value={extraCalories}
              onChange={e => setExtraCalories(e.target.value)}
              placeholder="e.g. 300"
              className="w-full bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <Button variant="primary" size="sm" onClick={saveExtra} disabled={savingExtra}>
            {savedExtra ? 'Saved' : 'Save'}
          </Button>
        </div>
        {planTotal.calories > 0 && extraCalories && (
          <p className="text-xs text-grey-muted mt-2">
            Plan ({planTotal.calories}) + Extra ({extraCalories}) = Total ({planTotal.calories + parseInt(extraCalories || '0')}) kcal
          </p>
        )}
      </div>
    </div>
  )
}
