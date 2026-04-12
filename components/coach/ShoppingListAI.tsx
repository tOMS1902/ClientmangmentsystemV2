'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import type { MealPlan } from '@/lib/types'

interface CustomItem {
  id: string
  name: string
  amount: string | null
  note: string | null
  action: 'add' | 'remove'
}

interface ShoppingListItem {
  name: string
  amount: string | null
}

interface ShoppingListAIProps {
  clientId: string
  mealPlans: MealPlan[]
}

function parseIngredientLine(line: string): { name: string; numValue: number | null; unit: string } {
  const trimmed = line.trim()
  // Fraction: "1/4 avocado", "1/2 cup oats"
  let m = trimmed.match(/^(\d+)\/(\d+)\s*([a-zA-Z]*)\s+(.+)$/)
  if (m) {
    return { name: m[4].trim(), numValue: parseInt(m[1]) / parseInt(m[2]), unit: m[3].toLowerCase() }
  }
  // Number + optional unit + name: "100g turkey breast", "2 eggs", "1 tortilla (60g)"
  m = trimmed.match(/^(\d+\.?\d*)\s*([a-zA-Z]*)\s+(.+)$/)
  if (m) {
    return { name: m[3].trim(), numValue: parseFloat(m[1]), unit: m[2].toLowerCase() }
  }
  return { name: trimmed, numValue: null, unit: '' }
}

function formatIngredientAmount(total: number, unit: string): string {
  const rounded = Math.round(total * 10) / 10
  return unit ? `${rounded}${unit}` : `${rounded}`
}

function buildShoppingItems(mealPlans: MealPlan[], overrides: Record<string, number>): ShoppingListItem[] {
  // key → { name, totalValue (numeric sum), unit, legacyCount, legacyPerServing }
  const map = new Map<string, { name: string; totalValue: number | null; unit: string; legacyCount: number; legacyPerServing: string | null }>()

  for (const plan of mealPlans) {
    const freq = overrides[plan.day_type] ?? plan.times_per_week ?? 1
    const seenInPlan = new Set<string>()

    for (const meal of plan.meals) {
      for (const item of meal.items) {
        if (item.ingredients && item.ingredients.length > 0) {
          for (const line of item.ingredients) {
            const { name, numValue, unit } = parseIngredientLine(line)
            const key = `${name.toLowerCase()}|${unit}`
            if (seenInPlan.has(key)) continue
            seenInPlan.add(key)
            const existing = map.get(key)
            if (numValue !== null) {
              if (existing) {
                existing.totalValue = (existing.totalValue ?? 0) + numValue * freq
              } else {
                map.set(key, { name, totalValue: numValue * freq, unit, legacyCount: 0, legacyPerServing: null })
              }
            } else {
              if (!existing) {
                map.set(key, { name, totalValue: null, unit: '', legacyCount: 0, legacyPerServing: null })
              }
            }
          }
        } else {
          // Legacy: no ingredients defined — use item name
          const key = `${item.name.toLowerCase()}|legacy`
          if (seenInPlan.has(key)) continue
          seenInPlan.add(key)
          const existing = map.get(key)
          if (existing) {
            existing.legacyCount += freq
          } else {
            map.set(key, { name: item.name, totalValue: null, unit: '', legacyCount: freq, legacyPerServing: item.description || null })
          }
        }
      }
    }
  }

  return Array.from(map.values()).map(entry => {
    if (entry.totalValue !== null) {
      return { name: entry.name, amount: formatIngredientAmount(entry.totalValue, entry.unit) }
    }
    if (entry.legacyCount > 0 && entry.legacyPerServing) {
      const m = entry.legacyPerServing.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/)
      if (m) {
        const total = Math.round(parseFloat(m[1]) * entry.legacyCount * 10) / 10
        return { name: entry.name, amount: entry.legacyCount <= 1 ? `${m[1]}${m[2]}` : `${total}${m[2]} (${m[1]}${m[2]} × ${entry.legacyCount})` }
      }
    }
    return { name: entry.name, amount: null }
  })
}

export function ShoppingListAI({ clientId, mealPlans }: ShoppingListAIProps) {
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [weekOverrides, setWeekOverrides] = useState<Record<string, number>>({})
  const [itemName, setItemName] = useState('')
  const [itemAmount, setItemAmount] = useState('')
  const [itemNote, setItemNote] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/shopping-list/${clientId}`)
    if (res.ok) {
      const data = await res.json()
      setCustomItems(data.items ?? [])
    }
  }, [clientId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function addItem() {
    if (!itemName.trim()) return
    setAdding(true)
    const res = await fetch(`/api/shopping-list/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          name: itemName.trim(),
          amount: itemAmount.trim() || undefined,
          note: itemNote.trim() || undefined,
          action: 'add',
        }],
      }),
    })
    if (res.ok) {
      setItemName('')
      setItemAmount('')
      setItemNote('')
      await fetchItems()
    }
    setAdding(false)
  }

  async function deleteItem(id: string) {
    await fetch(`/api/shopping-list/${clientId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCustomItems(prev => prev.filter(item => item.id !== id))
  }

  const planItems = buildShoppingItems(mealPlans, weekOverrides)

  return (
    <div>
      <Eyebrow>Weekly Shopping List</Eyebrow>
      <GoldRule />
      <p className="text-xs text-grey-muted mt-2 mb-4">
        The client sees this as their grocery list. Items from their meal plan are multiplied by how many days per week each plan runs.
        Add anything extra below.
      </p>

      {/* Per-plan frequency adjusters */}
      {mealPlans.length > 0 && (
        <div className="mb-5 p-4 bg-navy-deep border border-white/8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs text-white/40" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
              DAYS PER WEEK
            </p>
            {(() => {
              const total = mealPlans.reduce((sum, plan) => sum + (weekOverrides[plan.day_type] ?? plan.times_per_week ?? 1), 0)
              return (
                <span className={`text-xs font-semibold ${total === 7 ? 'text-gold' : total > 7 ? 'text-red-400' : 'text-orange-400'}`} style={{ fontFamily: 'var(--font-label)' }}>
                  {total}/7 days{total < 7 ? ' — shopping list is under a full week' : total > 7 ? ' — over 7 days' : ' ✓'}
                </span>
              )
            })()}
          </div>
          <div className="flex flex-col gap-3">
            {mealPlans.map(plan => {
              const freq = weekOverrides[plan.day_type] ?? plan.times_per_week ?? 1
              return (
                <div key={plan.day_type} className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-sm text-white min-w-32">{plan.name}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <button
                        key={n}
                        onClick={() => setWeekOverrides(prev => ({ ...prev, [plan.day_type]: n }))}
                        className={`w-7 h-7 text-xs border transition-colors ${
                          freq === n
                            ? 'bg-gold text-navy-deep border-gold font-semibold'
                            : 'bg-navy-mid border-white/20 text-white/50 hover:border-white/40'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-white/30 mt-3">
            Set days/week per plan. Adjusting here previews without saving — update the meal plan to make it permanent.
          </p>
        </div>
      )}

      {/* Meal plan items (aggregated) */}
      {planItems.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-white/40 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
            INGREDIENT LIST ({planItems.length} items)
          </p>
          <div className="flex flex-col">
            {planItems.map(item => (
              <div key={item.name} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{item.name}</span>
                {item.amount && <span className="text-xs text-gold/70 flex-shrink-0">{item.amount}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach custom additions */}
      {customItems.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-white/40 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
            YOUR ADDITIONS
          </p>
          <div className="flex flex-col gap-1.5">
            {customItems.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-sm text-white">{item.name}</span>
                  {item.amount && <span className="text-xs text-gold/70">{item.amount}</span>}
                  {item.note && <span className="text-xs text-grey-muted">{item.note}</span>}
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-grey-muted hover:text-red-400 transition-colors text-xs flex-shrink-0"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add item form */}
      <div>
        <p className="text-xs text-white/40 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
          ADD ITEM
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Item name (e.g. Greek yoghurt)"
              className="flex-1 bg-navy-mid border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <input
              type="text"
              value={itemAmount}
              onChange={e => setItemAmount(e.target.value)}
              placeholder="Amount (e.g. 500g)"
              className="w-32 bg-navy-mid border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={itemNote}
              onChange={e => setItemNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 bg-navy-mid border border-white/20 text-white/85 px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
            <Button variant="primary" size="sm" onClick={addItem} disabled={adding || !itemName.trim()}>
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
