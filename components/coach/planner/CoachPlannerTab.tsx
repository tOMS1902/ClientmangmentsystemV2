'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Save, Copy, Wand2 } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { CoachPlannerDayColumn } from './CoachPlannerDayColumn'
import { PlanTemplateModal } from './PlanTemplateModal'
import { PlanChangeLog } from './PlanChangeLog'
import type { WeeklyPlan, WeeklyPlanDay, WeeklyPlanTemplate, PlanStatus } from '@/lib/types'
import { getWeekMonday, shiftWeek, formatWeekRange } from '@/lib/planner'

interface CoachPlannerTabProps {
  clientId: string
}


export function CoachPlannerTab({ clientId }: CoachPlannerTabProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekMonday())
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [days, setDays] = useState<WeeklyPlanDay[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [coachMessage, setCoachMessage] = useState('')
  const [savingMessage, setSavingMessage] = useState(false)

  const fetchPlan = useCallback(async () => {
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

  useEffect(() => { fetchPlan() }, [fetchPlan])

  async function handleCreate(method: 'blank' | 'copy' | 'programme') {
    setCreating(true)
    if (method === 'blank') {
      await fetch(`/api/weekly-plans/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: weekStart }),
      })
    } else if (method === 'copy') {
      await fetch(`/api/weekly-plans/${clientId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: weekStart }),
      })
    } else if (method === 'programme') {
      // Create blank plan first to get the plan ID
      const createRes = await fetch(`/api/weekly-plans/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: weekStart }),
      })
      if (createRes.ok) {
        const created = await createRes.json()
        if (created?.id) {
          await fetch(`/api/weekly-plans/${clientId}/auto-populate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: created.id }),
          })
        }
      }
    }
    setCreating(false)
    fetchPlan()
  }

  async function handleApplyTemplate(template: WeeklyPlanTemplate) {
    setCreating(true)
    // Create plan first if it doesn't exist
    if (!plan) {
      await fetch(`/api/weekly-plans/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: weekStart }),
      })
    }
    // Re-fetch to get plan id, then apply template items
    const res = await fetch(`/api/weekly-plans/${clientId}?week_start=${weekStart}`)
    if (res.ok) {
      const freshPlan = await res.json()
      if (freshPlan.id && template.template_data.days) {
        const freshDays: WeeklyPlanDay[] = freshPlan.days ?? []
        for (const tDay of template.template_data.days) {
          const matchDay = freshDays.find(d => d.day_of_week === tDay.day_of_week)
          if (!matchDay) continue

          // Patch day settings
          await fetch(`/api/weekly-plans/${clientId}/${freshPlan.id}/days/${matchDay.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_type: tDay.day_type,
              nutrition_type: tDay.nutrition_type,
              step_target: tDay.step_target,
              notes: tDay.notes,
            }),
          })

          // Add items
          for (const tItem of tDay.items ?? []) {
            await fetch(`/api/weekly-plans/${clientId}/${freshPlan.id}/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                plan_day_id: matchDay.id,
                item_type: tItem.item_type,
                title: tItem.title,
                description: tItem.description,
                target: tItem.target,
                sort_order: tItem.sort_order,
              }),
            })
          }
        }
      }
    }
    setCreating(false)
    setTemplateOpen(false)
    fetchPlan()
  }

  async function handleStatusChange(status: PlanStatus) {
    if (!plan) return
    await fetch(`/api/weekly-plans/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, status }),
    })
    fetchPlan()
  }

  async function handleSaveMessage() {
    if (!plan) return
    setSavingMessage(true)
    await fetch(`/api/weekly-plans/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, coach_message: coachMessage || null }),
    })
    setSavingMessage(false)
  }

  const isThisWeek = weekStart === getWeekMonday()

  return (
    <div className="flex flex-col gap-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              <span className="text-[10px] text-gold">Current Week</span>
            )}
          </div>
          <button
            onClick={() => setWeekStart(prev => shiftWeek(prev, 1))}
            className="text-white/40 hover:text-white p-1"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {plan && (
          <div className="flex items-center gap-3">
            {/* Publish / unpublish */}
            {plan.status === 'published' ? (
              <button
                onClick={() => handleStatusChange('draft')}
                className="text-[10px] px-3 py-1 border border-gold/40 text-gold bg-gold/10 hover:bg-gold/20 transition-colors"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                ✓ Live — Click to Unpublish
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('published')}
                className="text-[10px] px-3 py-1 border border-white/20 text-white/70 hover:border-gold/40 hover:text-gold hover:bg-gold/10 transition-colors"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                Publish to Client
              </button>
            )}

            {/* Completed toggle */}
            <button
              onClick={() => handleStatusChange(plan.status === 'completed' ? 'published' : 'completed')}
              className={`text-[10px] px-2 py-0.5 border transition-colors ${
                plan.status === 'completed'
                  ? 'border-white/30 text-white/50 bg-white/5'
                  : 'border-white/10 text-white/30 hover:text-white/50'
              }`}
            >
              {plan.status === 'completed' ? 'Completed' : 'Mark Complete'}
            </button>

            {/* Template button */}
            <button
              onClick={() => setTemplateOpen(true)}
              className="text-[10px] text-white/40 hover:text-gold border border-white/10 hover:border-gold/30 px-2 py-0.5 flex items-center gap-1"
            >
              <Save size={10} /> Templates
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-white/40">Loading plan...</p>
        </div>
      ) : !plan ? (
        /* No plan — create options */
        <div className="bg-navy-card border border-white/8 p-8 flex flex-col items-center gap-4">
          <Eyebrow>No plan for this week</Eyebrow>
          <p className="text-xs text-white/40 text-center max-w-sm">
            Create a weekly plan to organise training, nutrition, steps, and habits for your client.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => handleCreate('blank')} disabled={creating} size="sm">
              Blank Plan
            </Button>
            <Button
              onClick={() => handleCreate('copy')}
              disabled={creating}
              size="sm"
              variant="ghost"
            >
              <Copy size={12} className="mr-1" /> Copy Previous Week
            </Button>
            <Button
              onClick={() => handleCreate('programme')}
              disabled={creating}
              size="sm"
              variant="ghost"
            >
              <Wand2 size={12} className="mr-1" /> From Programme
            </Button>
            <Button
              onClick={() => setTemplateOpen(true)}
              disabled={creating}
              size="sm"
              variant="ghost"
            >
              <Save size={12} className="mr-1" /> From Template
            </Button>
          </div>
          {creating && <p className="text-xs text-gold/60 animate-pulse">Creating plan...</p>}
        </div>
      ) : (
        <>
          {/* Coach message */}
          <div className="bg-navy-card border border-white/8 p-3">
            <Eyebrow className="mb-2">Coach Message</Eyebrow>
            <div className="flex gap-2">
              <textarea
                value={coachMessage}
                onChange={e => setCoachMessage(e.target.value)}
                placeholder="Add a message for your client this week..."
                className="flex-1 bg-navy-deep border border-white/10 text-white text-xs px-3 py-2 resize-none h-16 focus:outline-none focus:border-gold/40"
              />
              <Button
                onClick={handleSaveMessage}
                disabled={savingMessage}
                size="sm"
                className="self-end"
              >
                {savingMessage ? '...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {days
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map(day => (
                <CoachPlannerDayColumn
                  key={day.id}
                  day={day}
                  allDays={days}
                  clientId={clientId}
                  planId={plan.id}
                  onUpdate={fetchPlan}
                />
              ))}
          </div>

          {/* Change log */}
          <PlanChangeLog clientId={clientId} planId={plan.id} />
        </>
      )}

      {/* Template modal */}
      <PlanTemplateModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        plan={plan}
        onApply={handleApplyTemplate}
        onSaved={fetchPlan}
      />
    </div>
  )
}
