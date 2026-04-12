'use client'

import { useState, useCallback } from 'react'
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

interface ShoppingListDisplayItem {
  name: string
  amount: string | null
}

function parseIngredientLine(line: string): { name: string; numValue: number | null; unit: string } {
  const trimmed = line.trim()
  let m = trimmed.match(/^(\d+)\/(\d+)\s*([a-zA-Z]*)\s+(.+)$/)
  if (m) {
    return { name: m[4].trim(), numValue: parseInt(m[1]) / parseInt(m[2]), unit: m[3].toLowerCase() }
  }
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

function buildPlanItems(mealPlans: MealPlan[], removeNames: Set<string>): ShoppingListDisplayItem[] {
  const map = new Map<string, { name: string; totalValue: number | null; unit: string; legacyCount: number; legacyPerServing: string | null }>()

  for (const plan of mealPlans) {
    const freq = plan.times_per_week ?? 1
    const seenInPlan = new Set<string>()

    for (const meal of plan.meals) {
      for (const item of meal.items) {
        if (item.ingredients && item.ingredients.length > 0) {
          for (const line of item.ingredients) {
            const { name, numValue, unit } = parseIngredientLine(line)
            if (removeNames.has(name.toLowerCase())) continue
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
          if (removeNames.has(item.name.toLowerCase())) continue
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

export function ShoppingList({ mealPlans, customItems = [] }: ShoppingListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const removeNames = new Set(
    customItems.filter(c => c.action === 'remove').map(c => c.name.toLowerCase())
  )

  const planItems = buildPlanItems(mealPlans, removeNames)

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

  const copyToClipboard = useCallback(async () => {
    const lines: string[] = []
    for (const item of coachAdditions) {
      lines.push(item.amount ? `${item.amount} ${item.name}` : item.name)
    }
    for (const item of planItems) {
      lines.push(item.amount ? `${item.amount} ${item.name}` : item.name)
    }
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [coachAdditions, planItems])

  return (
    <div className="bg-navy-card border border-white/8 p-6 mt-6">
      <div className="flex items-center justify-between mb-1">
        <Eyebrow>Weekly Shopping List</Eyebrow>
        <div className="flex items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="text-xs text-grey-muted hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {copied ? 'Copied!' : 'Copy list'}
          </button>
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

        {/* All meal plan items with amounts */}
        {planItems.map(item => (
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
              {item.amount && (
                <span className="text-xs text-gold/70 flex-shrink-0">{item.amount}</span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
