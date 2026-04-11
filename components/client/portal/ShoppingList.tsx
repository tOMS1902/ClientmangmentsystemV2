'use client'

import { useState } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { MealPlan } from '@/lib/types'

interface CustomItem {
  id: string
  name: string
  amount: string | null
  note: string | null
  action: 'add' | 'remove'
}

interface ShoppingListProps {
  mealPlans: MealPlan[]
  customItems?: CustomItem[]
}

function formatMultipliedAmount(perServing: string | null, count: number): string | null {
  if (!perServing) return null
  const match = perServing.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/)
  if (!match) return null
  const num = parseFloat(match[1])
  const unit = match[2]
  if (isNaN(num)) return null
  if (count <= 1) return `${match[1]}${unit}`
  const total = Math.round(num * count * 10) / 10
  return `${total}${unit} (${match[1]}${unit} × ${count})`
}

export function ShoppingList({ mealPlans, customItems = [] }: ShoppingListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const removeNames = new Set(
    customItems.filter(c => c.action === 'remove').map(c => c.name.toLowerCase())
  )

  // Aggregate items across all plans, multiplied by times_per_week
  const itemMap = new Map<string, { name: string; count: number; perServingAmount: string | null }>()
  for (const plan of mealPlans) {
    const freq = plan.times_per_week ?? 1
    const seenInPlan = new Set<string>()
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const key = item.name.toLowerCase()
        if (!seenInPlan.has(key) && !removeNames.has(key)) {
          seenInPlan.add(key)
          const existing = itemMap.get(key)
          if (existing) {
            existing.count += freq
          } else {
            itemMap.set(key, { name: item.name, count: freq, perServingAmount: item.description || null })
          }
        }
      }
    }
  }
  const planItems = Array.from(itemMap.values())

  const coachAdditions = customItems.filter(c => c.action === 'add')
  const totalItems = planItems.length + coachAdditions.length
  const checkedCount = checked.size

  if (totalItems === 0) return null

  function toggle(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function clearChecked() {
    setChecked(new Set())
  }

  return (
    <div className="bg-navy-card border border-white/8 p-6 mt-6">
      <div className="flex items-center justify-between mb-1">
        <Eyebrow>Weekly Shopping List</Eyebrow>
        {checkedCount > 0 && (
          <button
            onClick={clearChecked}
            className="text-xs text-grey-muted hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Clear ticked ({checkedCount})
          </button>
        )}
      </div>
      <GoldRule />
      <p className="text-xs text-grey-muted mt-2 mb-4">
        {totalItems} item{totalItems !== 1 ? 's' : ''} · {mealPlans.reduce((s, p) => s + (p.times_per_week ?? 1), 0)} days · Tick off as you shop
      </p>

      <div className="flex flex-col gap-2">
        {/* Coach additions first */}
        {coachAdditions.map(item => (
          <label key={item.id} className="flex items-start gap-3 cursor-pointer py-1.5 border-b border-white/5 last:border-0">
            <input
              type="checkbox"
              checked={checked.has(`add-${item.id}`)}
              onChange={() => toggle(`add-${item.id}`)}
              className="mt-0.5 accent-gold flex-shrink-0"
            />
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <span className={`text-sm transition-colors ${checked.has(`add-${item.id}`) ? 'line-through text-grey-muted' : 'text-white'}`}>
                {item.name}
              </span>
              {item.amount && (
                <span className="text-xs text-gold/70 flex-shrink-0">{item.amount}</span>
              )}
              {item.note && (
                <span className="text-xs text-grey-muted">{item.note}</span>
              )}
            </div>
          </label>
        ))}

        {/* All meal plan items with multiplied amounts */}
        {planItems.map(item => {
          const amountDisplay = formatMultipliedAmount(item.perServingAmount, item.count)
          return (
            <label key={item.name} className="flex items-start gap-3 cursor-pointer py-1.5 border-b border-white/5 last:border-0">
              <input
                type="checkbox"
                checked={checked.has(item.name)}
                onChange={() => toggle(item.name)}
                className="mt-0.5 accent-gold flex-shrink-0"
              />
              <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                <span className={`text-sm transition-colors ${checked.has(item.name) ? 'line-through text-grey-muted' : 'text-white'}`}>
                  {item.name}
                </span>
                {amountDisplay && (
                  <span className="text-xs text-gold/70 flex-shrink-0">{amountDisplay}</span>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
