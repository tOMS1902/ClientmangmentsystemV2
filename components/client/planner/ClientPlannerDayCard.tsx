'use client'

import { Check } from 'lucide-react'
import type { WeeklyPlanDay, WeeklyPlanItem, NutritionTargets } from '@/lib/types'
import { DAY_LABELS } from '@/lib/planner'

interface ClientPlannerDayCardProps {
  day: WeeklyPlanDay
  allDays: WeeklyPlanDay[]
  clientId: string
  planId: string
  isToday: boolean
  targets: NutritionTargets | null
  onUpdate: () => void
}

export function ClientPlannerDayCard({ day, clientId, planId, isToday, targets, onUpdate }: ClientPlannerDayCardProps) {
  const items: WeeklyPlanItem[] = day.items ?? []
  const label = DAY_LABELS[day.day_of_week]
  const completedCount = items.filter(i => i.completed).length

  async function handleToggle(item: WeeklyPlanItem) {
    await fetch(`/api/weekly-plans/${clientId}/${planId}/items/${item.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed }),
    })
    onUpdate()
  }

  const borderColor = day.day_type === 'off'
    ? 'border-white/6'
    : isToday
      ? 'border-gold/40'
      : 'border-white/8'

  const nutritionLabel = day.nutrition_type === 'training' ? 'TD' : 'NTD'

  return (
    <div className={`bg-navy-card border ${borderColor} flex flex-col`}>
      {/* Day header */}
      <div className="p-2 border-b border-white/6 flex items-center justify-between">
        <span
          className={`text-[10px] ${isToday ? 'text-gold' : 'text-white/50'}`}
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {label}
        </span>
        {items.length > 0 && (
          <span className="text-[10px] text-white/30">
            {completedCount}/{items.length}
          </span>
        )}
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

      {/* Items */}
      <div className="flex-1 p-2 flex flex-col gap-1 min-h-[60px]">
        {day.day_type === 'off' && items.length === 0 && (
          <p className="text-[10px] text-white/20 text-center py-3">Day off</p>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-1.5 p-1.5 border border-white/6 ${item.completed ? 'opacity-50' : ''}`}
          >
            <button onClick={() => handleToggle(item)} className="mt-0.5 flex-shrink-0">
              <div className={`w-3.5 h-3.5 border ${
                item.completed ? 'bg-gold border-gold' : 'border-white/30'
              } flex items-center justify-center`}>
                {item.completed && <Check size={8} className="text-navy-deep" />}
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

            <ItemTypeBadge type={item.item_type} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ItemTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    training: 'text-blue-300',
    cardio: 'text-orange-300',
    steps: 'text-green-300',
    nutrition: 'text-purple-300',
    habit: 'text-yellow-300',
    custom: 'text-white/40',
  }
  return (
    <span className={`text-[8px] flex-shrink-0 ${colors[type] ?? colors.custom}`}>
      {type}
    </span>
  )
}
