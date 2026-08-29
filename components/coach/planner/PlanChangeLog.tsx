'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import type { WeeklyPlanChange } from '@/lib/types'

interface PlanChangeLogProps {
  clientId: string
  planId: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 2) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  move: 'border-orange-400/30 text-orange-400',
  complete: 'border-green-400/30 text-green-400',
  skip: 'border-red-400/30 text-red-400',
  add: 'border-blue-400/30 text-blue-400',
  delete: 'border-red-400/30 text-red-400',
  update: 'border-purple-400/30 text-purple-400',
}

export function PlanChangeLog({ clientId, planId }: PlanChangeLogProps) {
  const [changes, setChanges] = useState<WeeklyPlanChange[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/weekly-plans/${clientId}/${planId}/changes`)
      .then(r => r.ok ? r.json() : [])
      .then(setChanges)
      .finally(() => setLoading(false))
  }, [clientId, planId])

  if (loading) return null
  if (changes.length === 0) return null

  const visible = expanded ? changes : changes.slice(0, 5)

  return (
    <div className="bg-navy-card border border-white/8 p-3">
      <Eyebrow className="mb-2">Change Log</Eyebrow>
      <div className="flex flex-col gap-1.5">
        {visible.map(change => (
          <div key={change.id} className="flex items-start gap-2 text-xs">
            <span className={`flex-shrink-0 text-[9px] px-1 py-0.5 border ${
              CHANGE_TYPE_COLORS[change.change_type] ?? 'border-white/10 text-white/40'
            }`}>
              {change.change_type}
            </span>
            <span className="text-white/60 flex-1">{change.description}</span>
            <span className="text-white/20 flex-shrink-0 text-[10px]">
              {relativeTime(change.created_at)}
            </span>
          </div>
        ))}
      </div>
      {changes.length > 5 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="text-[10px] text-gold/60 hover:text-gold mt-2"
        >
          {expanded ? 'Show less' : `Show all ${changes.length} changes`}
        </button>
      )}
    </div>
  )
}
