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

interface ShoppingListAIProps {
  clientId: string
  trainingPlan: MealPlan | null
  restPlan: MealPlan | null
}

export function ShoppingListAI({ clientId, trainingPlan, restPlan }: ShoppingListAIProps) {
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
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

  // Collect all items from both meal plans (deduplicated)
  const seen = new Set<string>()
  const planItems: { name: string; amount: string | null }[] = []
  for (const plan of [trainingPlan, restPlan]) {
    if (!plan) continue
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const key = item.name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          planItems.push({ name: item.name, amount: item.description || null })
        }
      }
    }
  }

  return (
    <div>
      <Eyebrow>Weekly Shopping List</Eyebrow>
      <GoldRule />
      <p className="text-xs text-grey-muted mt-2 mb-4">
        The client sees this as their grocery list. Items from their meal plan are included automatically.
        Add anything extra below.
      </p>

      {/* Meal plan items (read-only preview) */}
      {planItems.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-white/40 mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
            FROM MEAL PLAN ({planItems.length} items)
          </p>
          <div className="flex flex-wrap gap-2">
            {planItems.map(item => (
              <span key={item.name} className="text-xs bg-navy-deep border border-white/10 text-white/60 px-2.5 py-1">
                {item.name}{item.amount ? ` · ${item.amount}` : ''}
              </span>
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
