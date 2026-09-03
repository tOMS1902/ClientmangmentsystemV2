'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { CoachPlannerItem } from './CoachPlannerItem'
import type { WeeklyPlanDay, WeeklyPlanItem, PlanDayType, PlanNutritionType, PlanItemType } from '@/lib/types'
import { DAY_LABELS } from '@/lib/planner'

interface CoachPlannerDayColumnProps {
  day: WeeklyPlanDay
  allDays: WeeklyPlanDay[]
  clientId: string
  planId: string
  onUpdate: () => void
  onToggle: (itemId: string, completed: boolean) => void
  onMove: (itemId: string, targetDayId: string, movedBy: 'client' | 'coach') => void
  onDelete: (itemId: string, dayId: string) => void
  onDayPatch: (dayId: string, patch: Record<string, unknown>) => void
  onAddItem: (dayId: string, item: { item_type: string; title: string; sort_order: number }) => Promise<void>
}

const DAY_TYPE_OPTIONS: PlanDayType[] = ['training', 'rest', 'off']
const NUTRITION_TYPE_OPTIONS: PlanNutritionType[] = ['training', 'rest']
const ITEM_TYPE_OPTIONS: PlanItemType[] = ['training', 'cardio', 'steps', 'nutrition', 'habit', 'custom']

export function CoachPlannerDayColumn({ day, allDays, clientId, planId, onUpdate, onToggle, onMove, onDelete, onDayPatch, onAddItem }: CoachPlannerDayColumnProps) {
  const [addingItem, setAddingItem] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<PlanItemType>('custom')

  // Debounced step target
  const [localStepTarget, setLocalStepTarget] = useState<string>(day.step_target?.toString() ?? '')
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalStepTarget(day.step_target?.toString() ?? '')
  }, [day.step_target])

  function handleStepChange(value: string) {
    setLocalStepTarget(value)
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    stepTimerRef.current = setTimeout(() => {
      onDayPatch(day.id, { step_target: value ? Number(value) : null })
    }, 800)
  }

  function handleStepBlur() {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    onDayPatch(day.id, { step_target: localStepTarget ? Number(localStepTarget) : null })
  }

  const items: WeeklyPlanItem[] = day.items ?? []
  const label = DAY_LABELS[day.day_of_week]

  async function handleAddItem() {
    if (!newTitle.trim()) return
    await onAddItem(day.id, {
      item_type: newType,
      title: newTitle.trim(),
      sort_order: items.length,
    })
    setNewTitle('')
    setAddingItem(false)
  }

  const dayTypeColor: Record<string, string> = {
    training: 'border-blue-500/30',
    rest: 'border-green-500/20',
    off: 'border-white/6',
  }

  const completedCount = items.filter(i => i.completed).length

  // Droppable zone for drag & drop
  const { isOver, setNodeRef } = useDroppable({ id: day.id })

  return (
    <div
      ref={setNodeRef}
      className={`bg-navy-card border ${
        isOver ? 'border-gold/60 bg-gold/5' : (dayTypeColor[day.day_type] ?? 'border-white/8')
      } flex flex-col transition-colors`}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/6">
        <div className="flex items-center justify-between mb-2">
          <Eyebrow>{label}</Eyebrow>
          {items.length > 0 && (
            <span className="text-[10px] text-white/40">
              {completedCount}/{items.length}
            </span>
          )}
        </div>

        {/* Day type selector */}
        <div className="flex gap-1 mb-2">
          {DAY_TYPE_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => onDayPatch(day.id, { day_type: t })}
              className={`text-[10px] px-2 py-0.5 border ${
                day.day_type === t
                  ? 'border-gold/40 text-gold bg-gold/10'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Nutrition type */}
        {day.day_type !== 'off' && (
          <div className="flex gap-1 mb-2">
            <span className="text-[10px] text-white/30 mr-1">Nutrition:</span>
            {NUTRITION_TYPE_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => onDayPatch(day.id, { nutrition_type: t })}
                className={`text-[10px] px-1.5 py-0.5 border ${
                  day.nutrition_type === t
                    ? 'border-purple-400/40 text-purple-300'
                    : 'border-white/10 text-white/30 hover:text-white/50'
                }`}
              >
                {t === 'training' ? 'TD' : 'NTD'}
              </button>
            ))}
          </div>
        )}

        {/* Step target (debounced) */}
        {day.day_type !== 'off' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/30">Steps:</span>
            <input
              type="number"
              value={localStepTarget}
              onChange={e => handleStepChange(e.target.value)}
              onBlur={handleStepBlur}
              placeholder="—"
              className="w-16 bg-transparent border-b border-white/10 text-[11px] text-white/60 px-1 py-0.5 focus:outline-none focus:border-gold/40"
            />
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 p-2 flex flex-col gap-1 min-h-[80px]">
        {items.map(item => (
          <CoachPlannerItem
            key={item.id}
            item={item}
            clientId={clientId}
            planId={planId}
            days={allDays}
            dayId={day.id}
            onUpdate={onUpdate}
            onToggle={onToggle}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}

        {day.day_type === 'off' && items.length === 0 && (
          <p className="text-xs text-white/20 text-center py-4">Day off</p>
        )}
      </div>

      {/* Add item */}
      {day.day_type !== 'off' && (
        <div className="p-2 border-t border-white/6">
          {addingItem ? (
            <div className="flex flex-col gap-1">
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as PlanItemType)}
                className="bg-navy-deep border border-white/20 text-white/60 text-[10px] px-2 py-1"
              >
                {ITEM_TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Item title..."
                className="bg-navy-deep border border-white/20 text-white text-xs px-2 py-1"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              <div className="flex gap-1">
                <button onClick={handleAddItem} className="text-[10px] text-gold hover:text-gold/80">Add</button>
                <button onClick={() => setAddingItem(false)} className="text-[10px] text-white/40">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-gold w-full justify-center py-1"
            >
              <Plus size={10} /> Add Item
            </button>
          )}
        </div>
      )}
    </div>
  )
}
