'use client'

import { useState, useCallback, useRef } from 'react'
import type { WeeklyPlan, WeeklyPlanDay, WeeklyPlanItem } from '@/lib/types'

interface UsePlanStateReturn {
  plan: WeeklyPlan | null
  days: WeeklyPlanDay[]
  loading: boolean
  coachMessage: string
  setCoachMessage: (msg: string) => void
  refresh: () => Promise<void>
  optimisticToggleItem: (itemId: string, completed: boolean) => void
  optimisticMoveItem: (itemId: string, targetDayId: string, movedBy: 'client' | 'coach') => void
  optimisticUpdateDay: (dayId: string, patch: Record<string, unknown>) => void
  optimisticDeleteItem: (itemId: string, dayId: string) => void
  addItem: (dayId: string, item: { item_type: string; title: string; sort_order: number }) => Promise<void>
}

export function usePlanState(clientId: string, weekStart: string): UsePlanStateReturn {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [days, setDays] = useState<WeeklyPlanDay[]>([])
  const [loading, setLoading] = useState(true)
  const [coachMessage, setCoachMessage] = useState('')
  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/weekly-plans/${clientId}?week_start=${weekStart}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.id) {
        setPlan(data)
        setDays(data.days ?? [])
        setCoachMessage(data.coach_message ?? '')
      } else {
        setPlan(null)
        setDays([])
        setCoachMessage('')
      }
    } else {
      setPlan(null)
      setDays([])
      setCoachMessage('')
    }
    setLoading(false)
  }, [clientId, weekStart])

  refreshRef.current = refresh

  const optimisticToggleItem = useCallback((itemId: string, completed: boolean) => {
    setDays(prev => prev.map(day => ({
      ...day,
      items: (day.items ?? []).map(item =>
        item.id === itemId ? { ...item, completed } : item
      ),
    })))

    const planId = plan?.id
    if (!planId) return

    fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    }).catch(() => refreshRef.current())
  }, [clientId, plan?.id])

  const optimisticMoveItem = useCallback((itemId: string, targetDayId: string, movedBy: 'client' | 'coach') => {
    setDays(prev => {
      let movedItem: WeeklyPlanItem | undefined
      let fromDow: number | undefined

      const without = prev.map(day => {
        const match = (day.items ?? []).find(i => i.id === itemId)
        if (match) {
          movedItem = match
          fromDow = day.day_of_week
        }
        return {
          ...day,
          items: (day.items ?? []).filter(i => i.id !== itemId),
        }
      })

      if (!movedItem) return prev

      return without.map(day => {
        if (day.id !== targetDayId) return day
        return {
          ...day,
          items: [
            ...(day.items ?? []),
            { ...movedItem!, plan_day_id: targetDayId, moved_from_day: fromDow ?? null, moved_by: movedBy },
          ],
        }
      })
    })

    const planId = plan?.id
    if (!planId) return

    fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_day_id: targetDayId, moved_by: movedBy }),
    }).catch(() => refreshRef.current())
  }, [clientId, plan?.id])

  const optimisticUpdateDay = useCallback((dayId: string, patch: Record<string, unknown>) => {
    setDays(prev => prev.map(day =>
      day.id === dayId ? { ...day, ...patch } : day
    ))

    const planId = plan?.id
    if (!planId) return

    fetch(`/api/weekly-plans/${clientId}/${planId}/days/${dayId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => refreshRef.current())
  }, [clientId, plan?.id])

  const optimisticDeleteItem = useCallback((itemId: string, _dayId: string) => {
    setDays(prev => prev.map(day => ({
      ...day,
      items: (day.items ?? []).filter(i => i.id !== itemId),
    })))

    const planId = plan?.id
    if (!planId) return

    fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}`, {
      method: 'DELETE',
    }).catch(() => refreshRef.current())
  }, [clientId, plan?.id])

  const addItem = useCallback(async (dayId: string, item: { item_type: string; title: string; sort_order: number }) => {
    const planId = plan?.id
    if (!planId) return

    const res = await fetch(`/api/weekly-plans/${clientId}/${planId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_day_id: dayId, ...item }),
    })

    if (res.ok) {
      await refreshRef.current()
    }
  }, [clientId, plan?.id])

  return {
    plan,
    days,
    loading,
    coachMessage,
    setCoachMessage,
    refresh,
    optimisticToggleItem,
    optimisticMoveItem,
    optimisticUpdateDay,
    optimisticDeleteItem,
    addItem,
  }
}
