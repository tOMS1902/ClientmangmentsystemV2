'use client'

import { MetricBar } from '@/components/ui/MetricBar'

interface PlannerSummaryBarProps {
  trainingDone: number
  trainingTotal: number
  stepsDone: number
  stepsTotal: number
  nutritionDone: number
  nutritionTotal: number
  overallDone: number
  overallTotal: number
}

export function PlannerSummaryBar({
  trainingDone,
  trainingTotal,
  stepsDone,
  stepsTotal,
  nutritionDone,
  nutritionTotal,
  overallDone,
  overallTotal,
}: PlannerSummaryBarProps) {
  if (overallTotal === 0) return null

  return (
    <div className="bg-navy-card border border-white/8 p-4">
      {/* Hero completion number */}
      <div className="text-center mb-4 pb-3 border-b border-white/6">
        <p className="text-3xl text-gold font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          {overallDone} <span className="text-white/30 text-lg font-normal">/ {overallTotal}</span>
        </p>
        <p className="text-[10px] text-white/40 mt-0.5" style={{ fontFamily: 'var(--font-label)' }}>
          COMPLETED
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trainingTotal > 0 && (
          <MetricBar
            label="Training"
            value={trainingDone}
            target={trainingTotal}
            unit="sessions"
            color="#3b82f6"
          />
        )}
        {stepsTotal > 0 && (
          <MetricBar
            label="Steps"
            value={stepsDone}
            target={stepsTotal}
            unit="days"
            color="#22c55e"
          />
        )}
        {nutritionTotal > 0 && (
          <MetricBar
            label="Nutrition"
            value={nutritionDone}
            target={nutritionTotal}
            unit="days"
            color="#a855f7"
          />
        )}
        <MetricBar
          label="Overall"
          value={overallDone}
          target={overallTotal}
          unit="items"
        />
      </div>
    </div>
  )
}
