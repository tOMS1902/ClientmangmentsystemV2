'use client'

import { useState, useCallback, useRef } from 'react'
import type { WeeklyPlan, WeeklyPlanDay, WeeklyPlanItem } from '@/lib/types'
import { getWeekMonday } from '@/lib/planner'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UsePlanStateReturn {
  plan: WeeklyPlan | null
  days: WeeklyPlanDay[]
  loading: boolean
  saveStatus: SaveStatus
  coachMessage: string
  setCoachMessage: (msg: string) => void
  refresh: () => Promise<void>
  setPlanDirectly: (data: WeeklyPlan & { days?: WeeklyPlanDay[] }) => void
  optimisticToggleItem: (itemId: string, completed: boolean) => void
  optimisticMoveItem: (itemId: string, targetDayId: string, movedBy: 'client' | 'coach') => void
  optimisticUpdateDay: (dayId: string, patch: Record<string, unknown>) => void
  optimisticDeleteItem: (itemId: string, dayId: string) => void
  addItem: (dayId: string, item: { item_type: string; title: string; sort_order: number }) => Promise<void>
  autoRolled: boolean
}

export function usePlanState(clientId: string, weekStart: string): UsePlanStateReturn {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [days, setDays] = useState<WeeklyPlanDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [coachMessage, setCoachMessage] = useState('')
  const [autoRolled, setAutoRolled] = useState(false)
  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [])

  const persistChange = useCallback(async (fn: () => Promise<Response>) => {
    setSaveStatus('saving')
    try {
      const res = await fn()
      if (!res.ok) throw new Error('save failed')
      markSaved()
      return res
    } catch {
      // One retry
      try {
        const res = await fn()
        if (!res.ok) throw new Error('save failed')
        markSaved()
        return res
      } catch {
        setSaveStatus('error')
        return null
      }
    }
  }, [markSaved])

  const refresh = useCallback(async () => {
    setLoading(true)
    setAutoRolled(false)
    const res = await fetch(`/api/weekly-plans/${clientId}?week_start=${weekStart}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.id) {
        setPlan(data)
        setDays(data.days ?? [])
        setCoachMessage(data.coach_message ?? '')
        setLoading(false)
        return
      }
    }

    // No plan found — try auto-rollover for current/future weeks only
    if (weekStart >= getWeekMonday()) {
      const copyRes = await fetch(`/api/weekly-plans/${clientId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_week_start: weekStart }),
      })
      if (copyRes.ok) {
        const copied = await copyRes.json()
        if (copied?.id) {
          setPlan(copied)
          setDays(copied.days ?? [])
          setCoachMessage(copied.coach_message ?? '')
          setAutoRolled(true)
          setLoading(false)
          return
        }
      }
    }

    setPlan(null)
    setDays([])
    setCoachMessage('')
    setLoading(false)
  }, [clientId, weekStart])

  refreshRef.current = refresh

  const setPlanDirectly = useCallback((data: WeeklyPlan & { days?: WeeklyPlanDay[] }) => {
    setPlan(data)
    setDays(data.days ?? [])
    setCoachMessage(data.coach_message ?? '')
    setLoading(false)
  }, [])

  const optimisticToggleItem = useCallback((itemId: string, completed: boolean) => {
    setDays(prev => prev.map(day => ({
      ...day,
      items: (day.items ?? []).map(item =>
        item.id === itemId ? { ...item, completed } : item
      ),
    })))

    const planId = plan?.id
    if (!planId) return

    persistChange(() =>
      fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
    ).then(res => { if (!res) refreshRef.current() })
  }, [clientId, plan?.id, persistChange])

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

    persistChange(() =>
      fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_day_id: targetDayId, moved_by: movedBy }),
      })
    ).then(res => { if (!res) refreshRef.current() })
  }, [clientId, plan?.id, persistChange])

  const optimisticUpdateDay = useCallback((dayId: string, patch: Record<string, unknown>) => {
    setDays(prev => prev.map(day =>
      day.id === dayId ? { ...day, ...patch } : day
    ))

    const planId = plan?.id
    if (!planId) return

    persistChange(() =>
      fetch(`/api/weekly-plans/${clientId}/${planId}/days/${dayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    ).then(res => { if (!res) refreshRef.current() })
  }, [clientId, plan?.id, persistChange])

  const optimisticDeleteItem = useCallback((itemId: string, _dayId: string) => {
    setDays(prev => prev.map(day => ({
      ...day,
      items: (day.items ?? []).filter(i => i.id !== itemId),
    })))

    const planId = plan?.id
    if (!planId) return

    persistChange(() =>
      fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}`, {
        method: 'DELETE',
      })
    ).then(res => { if (!res) refreshRef.current() })
  }, [clientId, plan?.id, persistChange])

  const addItem = useCallback(async (dayId: string, item: { item_type: string; title: string; sort_order: number }) => {
    const planId = plan?.id
    if (!planId) return

    // Optimistic: insert with temp ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const tempItem: WeeklyPlanItem = {
      id: tempId,
      plan_day_id: dayId,
      item_type: item.item_type as WeeklyPlanItem['item_type'],
      title: item.title,
      description: null,
      target: null,
      session_log_id: null,
      completed: false,
      completed_by: null,
      completed_at: null,
      sort_order: item.sort_order,
      programme_day_id: null,
      moved_from_day: null,
      moved_by: null,
      created_at: new Date().toISOString(),
    }

    setDays(prev => prev.map(day =>
      day.id === dayId
        ? { ...day, items: [...(day.items ?? []), tempItem] }
        : day
    ))

    const res = await persistChange(() =>
      fetch(`/api/weekly-plans/${clientId}/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_day_id: dayId, ...item }),
      })
    )

    if (res) {
      const created = await res.json()
      // Swap temp ID with real ID
      setDays(prev => prev.map(day =>
        day.id === dayId
          ? {
              ...day,
              items: (day.items ?? []).map(i =>
                i.id === tempId ? { ...i, ...created } : i
              ),
            }
          : day
      ))
    } else {
      // Rollback
      setDays(prev => prev.map(day =>
        day.id === dayId
          ? { ...day, items: (day.items ?? []).filter(i => i.id !== tempId) }
          : day
      ))
    }
  }, [clientId, plan?.id, persistChange])

  return {
    plan,
    days,
    loading,
    saveStatus,
    coachMessage,
    setCoachMessage,
    refresh,
    setPlanDirectly,
    optimisticToggleItem,
    optimisticMoveItem,
    optimisticUpdateDay,
    optimisticDeleteItem,
    addItem,
    autoRolled,
  }
}
