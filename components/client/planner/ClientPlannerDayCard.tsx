'use client'

import { useState } from 'react'
import { Check, ArrowRightLeft } from 'lucide-react'
import type { WeeklyPlanDay, WeeklyPlanItem, NutritionTargets } from '@/lib/types'
import { DAY_LABELS } from '@/lib/planner'

interface ClientPlannerDayCardProps {
  day: WeeklyPlanDay
  allDays: WeeklyPlanDay[]
  clientId: string
  planId: string
  isToday: boolean
  targets: NutritionTargets | null
  onToggle: (itemId: string, completed: boolean) => void
  onMove: (itemId: string, targetDayId: string, movedBy: 'client' | 'coach') => void
  onUpdate: () => void
}

export function ClientPlannerDayCard({ day, allDays, isToday, targets, onToggle, onMove }: ClientPlannerDayCardProps) {
  const [movingItemId, setMovingItemId] = useState<string | null>(null)
  const items: WeeklyPlanItem[] = day.items ?? []
  const label = DAY_LABELS[day.day_of_week]
  const completedCount = items.filter(i => i.completed).length
  const allDone = items.length > 0 && completedCount === items.length

  const borderColor = day.day_type === 'off'
    ? 'border-white/6'
    : isToday
      ? 'border-gold/40'
      : 'border-white/8'

  const nutritionLabel = day.nutrition_type === 'training' ? 'TD' : 'NTD'

  // Separate quick-tick items (steps/nutrition) from main items
  const mainItems = items.filter(i => i.item_type !== 'steps' && i.item_type !== 'nutrition')
  const quickTickItems = items.filter(i => i.item_type === 'steps' || i.item_type === 'nutrition')

  return (
    <div className={`bg-navy-card border ${borderColor} flex flex-col`}>
      {/* Day header */}
      <div className={`p-2 border-b border-white/6 flex items-center justify-between ${allDone ? 'bg-emerald-500/5' : ''}`}>
        <span
          className={`${isToday ? 'text-sm font-semibold text-gold' : 'text-[10px] text-white/50'}`}
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {allDone && (
            <span className="text-[9px] text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20"
              style={{ fontFamily: 'var(--font-label)' }}>
              Done
            </span>
          )}
          {items.length > 0 && (
            <span className="text-[10px] text-white/30">
              {completedCount}/{items.length}
            </span>
          )}
        </div>
      </div>

      {/* Day type + nutrition info */}
      {day.day_type !== 'off' && (
        <div className="px-2 pt-1.5 flex items-center gap-1.5">
          <span className={`text-[9px] px-1 py-0.5 border ${
            day.day_type === 'training' ? 'border-blue-500/30 text-blue-300' : 'border-green-500/20 text-green-300'
          }`}>
            {day.day_type}
          </span>
          <span className="text-[9px] px-1 py-0.5 border border-purple-400/30 text-purple-300">
            {nutritionLabel}
          </span>
        </div>
      )}

      {/* Step target */}
      {day.day_type !== 'off' && (day.step_target ?? targets?.daily_steps) && (
        <div className="px-2 pt-1">
          <span className="text-[9px] text-white/30">
            Steps: {(day.step_target ?? targets?.daily_steps)?.toLocaleString()}
          </span>
        </div>
      )}

      {/* Main items */}
      <div className="flex-1 p-2 flex flex-col gap-1 min-h-[60px]">
        {day.day_type === 'off' && items.length === 0 && (
          <p className="text-[10px] text-white/20 text-center py-3">Day off</p>
        )}

        {mainItems.map(item => (
          <div key={item.id}>
            <div
              className={`flex items-start gap-2 p-2 border-l-[3px] ${
                item.completed
                  ? 'bg-emerald-500/10 border-l-emerald-500/40 border border-emerald-500/10'
                  : `bg-white/[0.02] border border-white/6 ${itemBorderColor(item.item_type)}`
              }`}
            >
              <button
                onClick={() => onToggle(item.id, !item.completed)}
                className="mt-0.5 flex-shrink-0 p-0.5"
              >
                <div className={`w-6 h-6 border-2 rounded-sm ${
                  item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-gold/60'
                } flex items-center justify-center transition-colors`}>
                  {item.completed && <Check size={14} className="text-white" />}
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-[11px] leading-tight ${item.completed ? 'line-through text-white/40' : 'text-white/85'}`}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-[9px] text-white/30 mt-0.5">{item.description}</p>
                )}
                {item.target && (
                  <p className="text-[9px] text-gold/50 mt-0.5">{item.target}</p>
                )}
                {item.moved_from_day != null && (
                  <p className="text-[8px] text-orange-400/50 mt-0.5">
                    Moved from {DAY_LABELS[item.moved_from_day]}
                  </p>
                )}
              </div>

              {/* Inline move button */}
              {!item.completed && (
                <button
                  onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}
                  className="text-white/20 hover:text-white/50 flex-shrink-0 p-0.5"
                  title="Move to another day"
                >
                  <ArrowRightLeft size={12} />
                </button>
              )}
            </div>

            {/* Inline move day picker */}
            {movingItemId === item.id && (
              <div className="flex gap-1 flex-wrap p-1.5 bg-navy-deep/50 border border-white/6 border-t-0">
                {allDays
                  .filter(d => d.id !== day.id)
                  .sort((a, b) => a.day_of_week - b.day_of_week)
                  .map(d => (
                    <button
                      key={d.id}
                      onClick={() => { onMove(item.id, d.id, 'client'); setMovingItemId(null) }}
                      className="text-[10px] px-2 py-1 bg-navy-deep border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 transition-colors"
                    >
                      {DAY_LABELS[d.day_of_week]}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick-tick strip for steps/nutrition */}
      {quickTickItems.length > 0 && (
        <div className="p-2 border-t border-white/6 flex flex-col gap-1">
          {quickTickItems.map(item => (
            <button
              key={item.id}
              onClick={() => onToggle(item.id, !item.completed)}
              className={`flex items-center gap-2 p-1.5 text-[10px] border transition-colors ${
                item.completed
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/6 text-white/50 hover:border-gold/30 hover:text-gold'
              }`}
            >
              <div className={`w-4 h-4 border rounded-sm flex items-center justify-center ${
                item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'
              }`}>
                {item.completed && <Check size={10} className="text-white" />}
              </div>
              <span className={item.completed ? 'line-through' : ''}>{item.title}</span>
              <QuickTickIcon type={item.item_type} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function itemBorderColor(type: string): string {
  const colors: Record<string, string> = {
    training: 'border-l-blue-500/60',
    cardio: 'border-l-orange-500/60',
    steps: 'border-l-green-500/60',
    nutrition: 'border-l-purple-500/60',
    habit: 'border-l-yellow-500/60',
    custom: 'border-l-white/20',
  }
  return colors[type] ?? colors.custom
}

function QuickTickIcon({ type }: { type: string }) {
  if (type === 'steps') return <span className="text-green-400 ml-auto">👟</span>
  if (type === 'nutrition') return <span className="text-purple-400 ml-auto">🍽</span>
  return null
}
