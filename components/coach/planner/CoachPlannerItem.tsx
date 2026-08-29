'use client'

import { useState } from 'react'
import { Check, GripVertical, Trash2, ArrowRight } from 'lucide-react'
import type { WeeklyPlanItem, WeeklyPlanDay } from '@/lib/types'
import { DAY_LABELS } from '@/lib/planner'

interface CoachPlannerItemProps {
  item: WeeklyPlanItem
  clientId: string
  planId: string
  days: WeeklyPlanDay[]
  onUpdate: () => void
}

export function CoachPlannerItem({ item, clientId, planId, days, onUpdate }: CoachPlannerItemProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [target, setTarget] = useState(item.target ?? '')
  const [moving, setMoving] = useState(false)

  async function handlePatch(data: Record<string, unknown>) {
    await fetch(`/api/weekly-plans/${clientId}/${planId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    onUpdate()
  }

  async function handleDelete() {
    await fetch(`/api/weekly-plans/${clientId}/${planId}/items/${item.id}`, { method: 'DELETE' })
    onUpdate()
  }

  async function handleMove(targetDayId: string) {
    await fetch(`/api/weekly-plans/${clientId}/${planId}/items/${item.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_day_id: targetDayId, moved_by: 'coach' }),
    })
    setMoving(false)
    onUpdate()
  }

  async function handleToggleComplete() {
    await fetch(`/api/weekly-plans/${clientId}/${planId}/items/${item.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed }),
    })
    onUpdate()
  }

  function handleSaveEdit() {
    handlePatch({ title, description: description || null, target: target || null })
    setEditing(false)
  }

  const typeColors: Record<string, string> = {
    training: 'bg-blue-500/20 text-blue-300',
    cardio: 'bg-orange-500/20 text-orange-300',
    steps: 'bg-green-500/20 text-green-300',
    nutrition: 'bg-purple-500/20 text-purple-300',
    habit: 'bg-yellow-500/20 text-yellow-300',
    custom: 'bg-white/10 text-white/60',
  }

  return (
    <div className={`group border border-white/6 p-2 text-sm ${item.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-white/20 mt-0.5 flex-shrink-0 cursor-grab" />

        <button onClick={handleToggleComplete} className="mt-0.5 flex-shrink-0">
          <div className={`w-4 h-4 border ${item.completed ? 'bg-gold border-gold' : 'border-white/30'} flex items-center justify-center`}>
            {item.completed && <Check size={10} className="text-navy-deep" />}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-1">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-navy-deep border border-white/20 text-white text-xs px-2 py-1 w-full"
                autoFocus
              />
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description"
                className="bg-navy-deep border border-white/20 text-white/60 text-xs px-2 py-1 w-full"
              />
              <input
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="Target"
                className="bg-navy-deep border border-white/20 text-white/60 text-xs px-2 py-1 w-full"
              />
              <div className="flex gap-1">
                <button onClick={handleSaveEdit} className="text-xs text-gold hover:text-gold/80">Save</button>
                <button onClick={() => setEditing(false)} className="text-xs text-white/40 hover:text-white/60">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setEditing(true)} className="text-left w-full">
                <span className={`${item.completed ? 'line-through' : ''} text-white/85`}>{item.title}</span>
                {item.description && <p className="text-xs text-white/40 mt-0.5">{item.description}</p>}
                {item.target && <p className="text-xs text-gold/60 mt-0.5">{item.target}</p>}
              </button>
              {item.moved_from_day != null && (
                <p className="text-[10px] text-orange-400/60 mt-0.5">
                  Moved from {DAY_LABELS[item.moved_from_day]}
                </p>
              )}
            </div>
          )}
        </div>

        <span className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${typeColors[item.item_type] ?? typeColors.custom}`}>
          {item.item_type}
        </span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setMoving(!moving)} className="text-white/30 hover:text-white/60" title="Move">
            <ArrowRight size={12} />
          </button>
          <button onClick={handleDelete} className="text-white/30 hover:text-red-400" title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {moving && (
        <div className="mt-2 flex gap-1 flex-wrap pl-6">
          {days
            .filter(d => d.id !== item.plan_day_id)
            .map(d => (
              <button
                key={d.id}
                onClick={() => handleMove(d.id)}
                className="text-[10px] px-2 py-0.5 bg-navy-deep border border-white/10 text-white/60 hover:text-gold hover:border-gold/30"
              >
                {DAY_LABELS[d.day_of_week]}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
