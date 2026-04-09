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
  const [planExpanded, setPlanExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')

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

  async function deleteItem(id: string) {
    await fetch(`/api/shopping-list/${clientId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCustomItems(prev => prev.filter(item => item.id !== id))
  }

  async function handleSubmit() {
    if (!input.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ai/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: input }),
      })
      if (res.ok) {
        const data = await res.json()
        setConfirmMessage(data.reply ?? 'Done')
        setInput('')
        await fetchItems()
        setTimeout(() => setConfirmMessage(''), 4000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Collect auto-generated items from meal plans (deduplicated)
  const seen = new Set<string>()
  const planItems: { name: string; amount: string }[] = []
  for (const plan of [trainingPlan, restPlan]) {
    if (!plan) continue
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const key = item.name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          planItems.push({ name: item.name, amount: item.description })
        }
      }
    }
  }

  return (
    <div>
      <Eyebrow>Shopping List AI</Eyebrow>
      <GoldRule />

      {/* Custom modifications */}
      {customItems.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-xs text-white/50 mb-1" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
            MODIFICATIONS
          </p>
          {customItems.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className={`text-sm font-bold flex-shrink-0 ${item.action === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                  {item.action === 'add' ? '+' : '−'}
                </span>
                <span className={`text-sm ${item.action === 'remove' ? 'line-through text-grey-muted' : 'text-white'}`}>
                  {item.name}
                </span>
                {item.amount && (
                  <span className="text-xs text-gold/70 flex-shrink-0">{item.amount}</span>
                )}
                {item.note && <span className="text-xs text-grey-muted truncate">{item.note}</span>}
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
      )}

      {/* Auto-generated summary */}
      {planItems.length > 0 && (
        <div className="mt-4">
          <button
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors"
            onClick={() => setPlanExpanded(o => !o)}
          >
            <span style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
              {planItems.length} ITEMS FROM MEAL PLAN
            </span>
            <span>{planExpanded ? '▲' : '▼'}</span>
          </button>
          {planExpanded && (
            <div className="mt-2 flex flex-col gap-1">
              {planItems.map(({ name, amount }) => (
                <div key={name} className="flex items-baseline gap-2">
                  <p className="text-sm text-grey-muted">{name}</p>
                  {amount && <p className="text-xs text-gold/60">{amount}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI input */}
      <div className="mt-5">
        <label className="text-xs text-white/50 block mb-2" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
          ASK AI TO UPDATE LIST
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='e.g. "add blueberries and almond milk, remove eggs"'
          rows={2}
          className="w-full bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <div className="flex items-center justify-between mt-2 gap-3">
          <p className={`text-xs transition-opacity ${confirmMessage ? 'text-gold opacity-100' : 'opacity-0'}`}>
            {confirmMessage || '\u00a0'}
          </p>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting || !input.trim()}>
            {submitting ? 'Updating…' : 'Update'}
          </Button>
        </div>
      </div>
    </div>
  )
}
