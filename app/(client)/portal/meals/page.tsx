'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import type { MealPlan, Meal, Supplement } from '@/lib/types'
import { ShoppingList } from '@/components/client/portal/ShoppingList'

function MacroRow({ calories, protein, carbs, fat, muted }: { calories: number; protein: number; carbs: number; fat: number; muted?: boolean }) {
  const val = muted ? 'text-white/60' : 'text-white'
  const lbl = 'text-grey-muted'
  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      <span><span className={lbl}>kcal </span><span className={val}>{calories}</span></span>
      <span className="text-white/20">·</span>
      <span><span className={lbl}>P </span><span className={val}>{protein}g</span></span>
      <span className="text-white/20">·</span>
      <span><span className={lbl}>C </span><span className={val}>{carbs}g</span></span>
      <span className="text-white/20">·</span>
      <span><span className={lbl}>F </span><span className={val}>{fat}g</span></span>
    </div>
  )
}

function MealCard({ meal }: { meal: Meal }) {
  const total = meal.items.reduce((a, i) => ({
    calories: a.calories + i.calories,
    protein: a.protein + i.protein,
    carbs: a.carbs + i.carbs,
    fat: a.fat + i.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  return (
    <div className="bg-navy-card border border-white/8 mb-4">
      <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm text-white font-semibold" style={{ fontFamily: 'var(--font-label)' }}>
          {meal.name}
        </span>
        <MacroRow {...total} muted />
      </div>
      <div className="p-5">
        {meal.items.map((item, i) => (
          <div key={i} className={`py-3 ${i < meal.items.length - 1 ? 'border-b border-white/8' : ''}`}>
            <p className="text-sm text-white mb-0.5">{item.name}</p>
            {item.description && <p className="text-xs text-grey-muted mb-1.5">{item.description}</p>}
            <MacroRow calories={item.calories} protein={item.protein} carbs={item.carbs} fat={item.fat} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MealsPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [customItems, setCustomItems] = useState<{ id: string; name: string; amount: string | null; note: string | null; action: 'add' | 'remove' }[]>([])
  const [extraCalories, setExtraCalories] = useState('')
  const [savedExtra, setSavedExtra] = useState(false)
  const [savingExtra, setSavingExtra] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const clientRes = await fetch('/api/clients/me')
        if (clientRes.ok) {
          const client = await clientRes.json()
          const [mealRes, suppRes] = await Promise.all([
            fetch(`/api/meal-plan/${client.id}`),
            fetch(`/api/supplements/${client.id}`),
          ])
          if (mealRes.ok) {
            const data = await mealRes.json()
            const loadedPlans: MealPlan[] = data.plans ?? []
            setPlans(loadedPlans)
            if (loadedPlans.length > 0) setActiveTab(loadedPlans[0].day_type)
          }
          if (suppRes.ok) {
            setSupplements(await suppRes.json())
          }
          const customRes = await fetch(`/api/shopping-list/${client.id}`)
          if (customRes.ok) {
            const data = await customRes.json()
            setCustomItems(data.items ?? [])
          }
        }
      } catch {
        // no data
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

  const activePlan = plans.find(p => p.day_type === activeTab) ?? null

  const planTotal = activePlan?.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.items.reduce((a, i) => a + i.calories, 0),
    protein: acc.protein + meal.items.reduce((a, i) => a + i.protein, 0),
    carbs: acc.carbs + meal.items.reduce((a, i) => a + i.carbs, 0),
    fat: acc.fat + meal.items.reduce((a, i) => a + i.fat, 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

  if (loading) return <div className="text-grey-muted">Loading meals...</div>

  return (
    <div>
      <div className="mb-6">
        <Eyebrow>Today&apos;s Meal Plan</Eyebrow>
        <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          Meals
        </h1>
      </div>

      {/* Tab toggle — dynamic based on plans */}
      {plans.length > 0 && (
        <div className="flex gap-4 mb-6 border-b border-white/8 overflow-x-auto scrollbar-none">
          {plans.map(plan => (
            <button
              key={plan.day_type}
              onClick={() => setActiveTab(plan.day_type)}
              className={`pb-3 text-sm transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === plan.day_type ? 'text-gold border-b-2 border-gold' : 'text-grey-muted hover:text-white'}`}
              style={{ fontFamily: 'var(--font-label)' }}
            >
              {plan.name}
            </button>
          ))}
        </div>
      )}

      {!activePlan ? (
        <p className="text-grey-muted">No meal plan set yet.</p>
      ) : (
        <div>
          {activePlan.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}

          <div className="mt-4 p-4 border-t border-white/8">
            <p className="text-xs text-grey-muted mb-1.5" style={{ fontFamily: 'var(--font-label)' }}>DAILY TOTAL</p>
            <MacroRow calories={planTotal.calories} protein={planTotal.protein} carbs={planTotal.carbs} fat={planTotal.fat} />
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

      {supplements.length > 0 && (
        <div className="bg-navy-card border border-white/8 p-6 mt-6">
          <Eyebrow>Supplements</Eyebrow>
          <GoldRule />
          <div className="mt-3 flex flex-col gap-0">
            {supplements.map(s => (
              <div key={s.id} className="py-3 border-b border-white/8 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white">
                      {s.name}
                      <span className="text-grey-muted ml-2 font-normal">{s.dose}</span>
                    </p>
                    <p className="text-xs text-gold/80 mt-0.5">{s.timing}</p>
                    {s.notes && <p className="text-xs text-grey-muted mt-0.5">{s.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ShoppingList mealPlans={plans} customItems={customItems} />
    </div>
  )
}
