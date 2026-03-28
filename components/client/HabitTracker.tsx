'use client'

import { useState } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { Habit, HabitLog } from '@/lib/types'

interface HabitTrackerProps {
  habits: Habit[]
  todayLogs: HabitLog[]
  streaks: Record<string, number>
}

export function HabitTracker({ habits, todayLogs, streaks }: HabitTrackerProps) {
  const [completedToday, setCompletedToday] = useState<Record<string, boolean>>(
    Object.fromEntries(todayLogs.map(l => [l.habit_id, l.completed]))
  )

  async function toggleHabit(habitId: string) {
    const newValue = !completedToday[habitId]
    setCompletedToday(prev => ({ ...prev, [habitId]: newValue }))

    await fetch('/api/habit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, completed: newValue }),
    })
  }

  return (
    <div>
      <Eyebrow>Daily Habits</Eyebrow>
      <GoldRule />
      <div className="flex flex-col gap-3 mt-3">
        {habits.map(habit => {
          const done = completedToday[habit.id] || false
          const streak = streaks[habit.id] || 0
          return (
            <div key={habit.id} className="flex items-center justify-between py-3 border-b border-white/8">
              <div>
                <p className="text-sm text-white">{habit.name}</p>
                {streak > 0 && (
                  <p className="text-xs text-grey-muted mt-0.5">{streak} day streak</p>
                )}
              </div>
              <button
                onClick={() => toggleHabit(habit.id)}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                  done
                    ? 'bg-gold text-navy-deep'
                    : 'bg-navy-card border border-grey-muted text-transparent'
                }`}
              >
                {done && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
        {habits.length === 0 && (
          <p className="text-grey-muted text-sm">No habits set yet.</p>
        )}
      </div>
    </div>
  )
}
