'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { ClientPlannerDayCard } from './ClientPlannerDayCard'
import { PlannerSummaryBar } from './PlannerSummaryBar'
import { WeekChangedModal } from './WeekChangedModal'
import type { NutritionTargets } from '@/lib/types'
import { getWeekMonday, shiftWeek, formatWeekRange, DAY_LABELS } from '@/lib/planner'
import { usePlanState } from '@/hooks/usePlanState'

interface ClientPlannerViewProps {
  clientId: string
  targets: NutritionTargets | null
}

export function ClientPlannerView({ clientId, targets }: ClientPlannerViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekMonday())
  const [weekChangedOpen, setWeekChangedOpen] = useState(false)
  const todayRef = useRef<HTMLDivElement>(null)

  const {
    plan, days, loading, refresh,
    optimisticToggleItem, optimisticMoveItem,
  } = usePlanState(clientId, weekStart)

  useEffect(() => { refresh() }, [refresh])

  // Auto-scroll to today's card on mobile after load
  useEffect(() => {
    if (!loading && plan && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [loading, plan])

  // Determine today's day_of_week (0=Mon..6=Sun)
  const now = new Date()
  const jsDay = now.getDay()
  const todayDow = jsDay === 0 ? 6 : jsDay - 1

  const isThisWeek = weekStart === getWeekMonday()

  const sortedDays = [...days].sort((a, b) => a.day_of_week - b.day_of_week)

  // Compute summary stats
  const allItems = sortedDays.flatMap(d => d.items ?? [])
  const trainingItems = allItems.filter(i => i.item_type === 'training')
  const stepsItems = allItems.filter(i => i.item_type === 'steps')
  const nutritionItems = allItems.filter(i => i.item_type === 'nutrition')

  const completedCount = (items: typeof allItems) => items.filter(i => i.completed).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Eyebrow>Weekly Plan</Eyebrow>
        <GoldRule className="mt-2" />
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(prev => shiftWeek(prev, -1))}
          className="text-white/40 hover:text-white p-1"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm text-white" style={{ fontFamily: 'var(--font-label)' }}>
            {formatWeekRange(weekStart)}
          </p>
          {isThisWeek && (
            <span className="text-[10px] text-gold">This Week</span>
          )}
        </div>
        <button
          onClick={() => setWeekStart(prev => shiftWeek(prev, 1))}
          className="text-white/40 hover:text-white p-1"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-white/40">Loading your plan...</p>
        </div>
      ) : !plan ? (
        <div className="bg-navy-card border border-white/8 p-8 text-center">
          <p className="text-sm text-grey-muted">No plan set for this week yet.</p>
          <p className="text-xs text-white/30 mt-1">Your coach will publish one soon.</p>
        </div>
      ) : (
        <>
          {/* Coach message */}
          {plan.coach_message && (
            <div className="bg-navy-card border border-gold/20 p-4 flex gap-3">
              <MessageSquare size={16} className="text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-gold mb-1" style={{ fontFamily: 'var(--font-label)' }}>
                  FROM YOUR COACH
                </p>
                <p className="text-sm text-white/85 leading-relaxed">{plan.coach_message}</p>
              </div>
            </div>
          )}

          {/* Summary bar */}
          <PlannerSummaryBar
            trainingDone={completedCount(trainingItems)}
            trainingTotal={trainingItems.length}
            stepsDone={completedCount(stepsItems)}
            stepsTotal={stepsItems.length}
            nutritionDone={completedCount(nutritionItems)}
            nutritionTotal={nutritionItems.length}
            overallDone={completedCount(allItems)}
            overallTotal={allItems.length}
          />

          {/* Day-of-week header strip */}
          <div className="hidden md:grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`text-center text-[10px] py-1 ${
                  isThisWeek && todayDow === i
                    ? 'text-gold border-b-2 border-gold'
                    : 'text-white/30'
                }`}
                style={{ fontFamily: 'var(--font-label)' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day cards */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {sortedDays.map(day => {
              const isDayToday = isThisWeek && todayDow === day.day_of_week
              return (
                <div key={day.id} ref={isDayToday ? todayRef : undefined}>
                  <ClientPlannerDayCard
                    day={day}
                    allDays={days}
                    clientId={clientId}
                    planId={plan.id}
                    isToday={isDayToday}
                    targets={targets}
                    onToggle={optimisticToggleItem}
                    onMove={optimisticMoveItem}
                    onUpdate={refresh}
                  />
                </div>
              )
            })}
          </div>

          {/* My Week Changed button */}
          <div className="flex justify-center">
            <button
              onClick={() => setWeekChangedOpen(true)}
              className="text-xs text-white/40 hover:text-gold border border-white/10 hover:border-gold/30 px-4 py-2 transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              My Week Changed
            </button>
          </div>

          <WeekChangedModal
            open={weekChangedOpen}
            onClose={() => setWeekChangedOpen(false)}
            days={days}
            clientId={clientId}
            planId={plan.id}
            onUpdate={refresh}
          />
        </>
      )}
    </div>
  )
}
