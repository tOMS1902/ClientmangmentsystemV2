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

interface AggregatedItem {
  name: string
  count: number
  perServingAmount: string | null
}

interface ShoppingListAIProps {
  clientId: string
  mealPlans: MealPlan[]
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

function buildAggregatedItems(mealPlans: MealPlan[], overrides: Record<string, number>): AggregatedItem[] {
  const itemMap = new Map<string, AggregatedItem>()
  for (const plan of mealPlans) {
    const freq = overrides[plan.day_type] ?? plan.times_per_week ?? 1
    const seenInPlan = new Set<string>()
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const key = item.name.toLowerCase()
        if (!seenInPlan.has(key)) {
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
  return Array.from(itemMap.values())
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

  const planItems = buildAggregatedItems(mealPlans, weekOverrides)

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
          <p className="text-xs text-white/40 mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
            ADJUST THIS WEEK
          </p>
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
                    <span className="text-xs text-white/30 ml-1">days</span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-white/30 mt-3">
            Default from meal plan. Adjust here to preview a different week without changing the plan.
          </p>
        </div>
      )}

      {/* Meal plan items (aggregated) */}
      {planItems.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-white/40 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
            FROM MEAL PLAN ({planItems.length} items)
          </p>
          <div className="flex flex-wrap gap-2">
            {planItems.map(item => {
              const display = formatMultipliedAmount(item.perServingAmount, item.count)
              return (
                <span key={item.name} className="text-xs bg-navy-deep border border-white/10 text-white/60 px-2.5 py-1">
                  {item.name}{display ? ` · ${display}` : ''}
                </span>
              )
            })}
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
