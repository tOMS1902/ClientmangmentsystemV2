'use client'
import { useState } from 'react'
import type { DiagnosticInsight, InsightCategory, InsightPriority } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface Props {
  insight: DiagnosticInsight
  isCoach: boolean
  onUpdate?: (id: string, updates: Partial<DiagnosticInsight>) => void
  onDelete?: (id: string) => void
}

const BORDER_COLORS: Record<InsightPriority, string> = {
  'high':   '#3D1616',
  'medium': '#3D2E06',
  'low':    '#1A4A2E',
}

const BG_COLORS: Record<InsightPriority, string> = {
  'high':   '#1E0C0C',
  'medium': '#1E1808',
  'low':    '#0A1E10',
}

const INSIGHT_CATEGORIES: { value: InsightCategory; label: string }[] = [
  { value: 'priority-focus', label: 'Priority Focus' },
  { value: 'key-risks',      label: 'Key Risks' },
  { value: 'nutrition',      label: 'Nutrition' },
  { value: 'training',       label: 'Training' },
  { value: 'recovery',       label: 'Recovery' },
  { value: 'general',        label: 'General Insights' },
]

export function InsightCard({ insight, isCoach, onUpdate, onDelete }: Props) {
  const [note, setNote] = useState(insight.coach_note || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const borderColor = BORDER_COLORS[insight.priority]
  const bgColor = BG_COLORS[insight.priority]

  const handleNoteBlur = () => {
    if (onUpdate && note !== insight.coach_note) {
      onUpdate(insight.id, { coach_note: note })
    }
  }

  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 10,
      padding: '16px 18px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <StatusBadge priority={insight.priority} />
        {isCoach && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onUpdate && (
              <>
                <select
                  value={insight.category}
                  onChange={e => onUpdate(insight.id, { category: e.target.value as InsightCategory })}
                  style={{
                    fontSize: 11,
                    backgroundColor: '#131929',
                    border: '1px solid #1A2A40',
                    color: '#8A9AB8',
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  {INSIGHT_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={insight.priority}
                  onChange={e => onUpdate(insight.id, { priority: e.target.value as InsightPriority })}
                  style={{
                    fontSize: 11,
                    backgroundColor: '#131929',
                    border: '1px solid #1A2A40',
                    color: '#8A9AB8',
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </>
            )}
            {onDelete && (
              confirmDelete ? (
                <span style={{ fontSize: 11, color: '#F87171' }}>
                  Sure?{' '}
                  <button
                    onClick={() => onDelete(insight.id)}
                    style={{ color: '#F87171', cursor: 'pointer', background: 'none', border: 'none', fontSize: 11 }}
                  >
                    Yes
                  </button>
                  {' / '}
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ color: '#8A9AB8', cursor: 'pointer', background: 'none', border: 'none', fontSize: 11 }}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ fontSize: 11, color: '#4A5A7A', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  Delete
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: '#E8F0FC', marginBottom: 6 }}>
        {insight.title}
      </div>
      <p style={{ fontSize: 12, color: '#C8D4E8', lineHeight: 1.6, marginBottom: isCoach ? 10 : 0 }}>
        {insight.description}
      </p>

      {!isCoach && insight.coach_note && (
        <div style={{
          borderLeft: '2px solid #B89A5C',
          paddingLeft: 10,
          marginTop: 10,
          fontSize: 12,
          color: '#C8D4E8',
          fontStyle: 'italic',
        }}>
          {insight.coach_note}
        </div>
      )}

      {!isCoach && insight.recommendation && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          backgroundColor: '#131929',
          borderRadius: 6,
          fontSize: 12,
          color: '#C8D4E8',
        }}>
          <strong style={{ color: '#B89A5C' }}>Action: </strong>{insight.recommendation}
        </div>
      )}

      {isCoach && (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Add your note on this insight…"
          rows={2}
          style={{
            width: '100%',
            backgroundColor: '#131929',
            border: '1px solid #1A2A40',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: '#C8D4E8',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  )
}
