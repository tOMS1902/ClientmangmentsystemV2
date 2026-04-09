'use client'

import { useState } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { MealPlan } from '@/lib/types'

interface CustomItem {
  id: string
  name: string
  note: string | null
  action: 'add' | 'remove'
}

interface ShoppingListProps {
  trainingPlan: MealPlan | null
  restPlan: MealPlan | null
  customItems?: CustomItem[]
}

interface ShoppingItem {
  name: string
  description: string
  mealName: string
}

export function ShoppingList({ trainingPlan, restPlan, customItems = [] }: ShoppingListProps) {
  const [open, setOpen] = useState(true)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  if (!trainingPlan && !restPlan && customItems.length === 0) return null

  // Names to remove (case-insensitive)
  const removeNames = new Set(
    customItems.filter(c => c.action === 'remove').map(c => c.name.toLowerCase())
  )

  // Collect all items from both plans, deduplicate by name (case-insensitive), skip removes
  const seen = new Set<string>()
  const items: ShoppingItem[] = []

  for (const plan of [trainingPlan, restPlan]) {
    if (!plan) continue
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const key = item.name.toLowerCase()
        if (!seen.has(key) && !removeNames.has(key)) {
          seen.add(key)
          items.push({ name: item.name, description: item.description, mealName: meal.name })
        }
      }
    }
  }

  const coachAdditions = customItems.filter(c => c.action === 'add')

  // Group by meal name
  const groups = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    if (!acc[item.mealName]) acc[item.mealName] = []
    acc[item.mealName].push(item)
    return acc
  }, {})

  function toggle(name: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="bg-navy-card border border-white/8 p-6 mt-6">
      <div className="flex items-center justify-between mb-1 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <Eyebrow>Shopping List</Eyebrow>
        <span className="text-grey-muted text-xs">{open ? '▲' : '▼'}</span>
      </div>
      <GoldRule />

      {open && (
        <div className="mt-4 flex flex-col gap-6">
          {Object.entries(groups).map(([mealName, mealItems]) => (
            <div key={mealName}>
              <p className="text-xs text-gold/80 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
                {mealName.toUpperCase()}
              </p>
              <div className="flex flex-col gap-2">
                {mealItems.map(item => (
                  <label key={item.name} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked.has(item.name)}
                      onChange={() => toggle(item.name)}
                      className="mt-0.5 accent-gold"
                    />
                    <div>
                      <p className={`text-sm transition-colors ${checked.has(item.name) ? 'line-through text-grey-muted' : 'text-white'}`}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-xs text-grey-muted">{item.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {coachAdditions.length > 0 && (
            <div>
              <p className="text-xs text-gold/80 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
                COACH'S ADDITIONS
              </p>
              <div className="flex flex-col gap-2">
                {coachAdditions.map(item => (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked.has(item.name)}
                      onChange={() => toggle(item.name)}
                      className="mt-0.5 accent-gold"
                    />
                    <div>
                      <p className={`text-sm transition-colors ${checked.has(item.name) ? 'line-through text-grey-muted' : 'text-white'}`}>
                        {item.name}
                      </p>
                      {item.note && (
                        <p className="text-xs text-grey-muted">{item.note}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
