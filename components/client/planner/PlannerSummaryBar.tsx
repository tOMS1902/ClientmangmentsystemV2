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
