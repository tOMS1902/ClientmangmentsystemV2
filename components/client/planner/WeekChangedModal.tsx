'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { WeeklyPlanDay, WeeklyPlanItem } from '@/lib/types'
import { DAY_LABELS } from '@/lib/planner'

interface WeekChangedModalProps {
  open: boolean
  onClose: () => void
  days: WeeklyPlanDay[]
  clientId: string
  planId: string
  onUpdate: () => void
}

const REASONS = [
  'Schedule changed',
  'Feeling unwell',
  'Work/travel conflict',
  'Energy levels',
  'Other',
]

export function WeekChangedModal({ open, onClose, days, clientId, planId, onUpdate }: WeekChangedModalProps) {
  const [reason, setReason] = useState('')
  const [moves, setMoves] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const sortedDays = [...days].sort((a, b) => a.day_of_week - b.day_of_week)
  const movableItems = sortedDays.flatMap(d =>
    (d.items ?? [])
      .filter(i => !i.completed)
      .map(i => ({ ...i, currentDayId: d.id, currentDayLabel: DAY_LABELS[d.day_of_week] }))
  )

  function handleMoveChange(itemId: string, targetDayId: string) {
    setMoves(prev => ({ ...prev, [itemId]: targetDayId }))
  }

  async function handleSubmit() {
    setSaving(true)

    // Execute all moves
    const moveEntries = Object.entries(moves).filter(([, targetDayId]) => targetDayId)
    for (const [itemId, targetDayId] of moveEntries) {
      await fetch(`/api/weekly-plans/${clientId}/${planId}/items/${itemId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_day_id: targetDayId, moved_by: 'client' }),
      })
    }

    setSaving(false)
    setMoves({})
    setReason('')
    onUpdate()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-navy-card border border-white/10 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <h3 className="text-sm text-white" style={{ fontFamily: 'var(--font-label)' }}>
            My Week Changed
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Reason picker */}
          <div>
            <p className="text-xs text-white/50 mb-2">What happened?</p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-[10px] px-2.5 py-1 border ${
                    reason === r
                      ? 'border-gold/40 text-gold bg-gold/10'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Move items */}
          {movableItems.length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-2">Move incomplete items</p>
              <div className="flex flex-col gap-2">
                {movableItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between border border-white/6 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/85 truncate">{item.title}</p>
                      <p className="text-[10px] text-white/30">{item.currentDayLabel}</p>
                    </div>
                    <select
                      value={moves[item.id] ?? ''}
                      onChange={e => handleMoveChange(item.id, e.target.value)}
                      className="bg-navy-deep border border-white/20 text-white/60 text-[10px] px-2 py-1 ml-2"
                    >
                      <option value="">Keep</option>
                      {sortedDays
                        .filter(d => d.id !== item.currentDayId)
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {DAY_LABELS[d.day_of_week]}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/8 flex gap-2 justify-end">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || (!reason && Object.keys(moves).length === 0)}
            size="sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
