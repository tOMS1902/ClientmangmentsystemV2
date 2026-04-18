'use client'
import { useState } from 'react'
import type { GeneticCategory, GeneticCategoryNote } from '@/lib/types'

const SURFACE = '#0F1827', RAISED = '#131929', BORDER = '#1A2A40'
const TEXT_PRIMARY = '#E8F0FC', TEXT_SECONDARY = '#C8D4E8', TEXT_MUTED = '#8A9AB8', TEXT_HINT = '#4A5A7A'
const GREEN = '#3ECF8E', AMBER = '#FBBF24', RED = '#F87171', GOLD = '#B89A5C'

const CATEGORY_ORDER: GeneticCategory[] = [
  'Macronutrient Metabolism',
  'Toxin Sensitivity',
  'Mental Health & Cognitive Performance',
  'Immune Support',
  'DNA Protection & Repair',
  'Methylation',
  'Hormone Support',
  'Cardiovascular Health & Athletic Performance',
]

const CATEGORY_EMOJI: Record<GeneticCategory, string> = {
  'Macronutrient Metabolism': '🍽️',
  'Toxin Sensitivity': '🧪',
  'Mental Health & Cognitive Performance': '🧠',
  'Immune Support': '🛡️',
  'DNA Protection & Repair': '🔬',
  'Methylation': '⚗️',
  'Hormone Support': '⚖️',
  'Cardiovascular Health & Athletic Performance': '❤️',
}

const PRIORITY_COLOR: Record<string, string> = { high: RED, medium: AMBER, low: GREEN }
const PRIORITY_BG: Record<string, string> = { high: '#1E0C0C', medium: '#1E1808', low: '#0A1E10' }
const PRIORITY_BORDER: Record<string, string> = { high: '#3D1616', medium: '#3D2E06', low: '#1A4A2E' }

interface Props {
  categoryNotes: Partial<Record<GeneticCategory, GeneticCategoryNote>>
}

export function GeneticCategoryGrid({ categoryNotes }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (cat: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Category Breakdown
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {CATEGORY_ORDER.map(cat => {
          const note = categoryNotes[cat]
          const isExpanded = expanded.has(cat)
          const priority = note?.priority ?? null

          return (
            <div
              key={cat}
              style={{
                backgroundColor: priority ? PRIORITY_BG[priority] : RAISED,
                border: `1px solid ${priority ? PRIORITY_BORDER[priority] : BORDER}`,
                borderLeft: `3px solid ${priority ? PRIORITY_COLOR[priority] : BORDER}`,
                borderRadius: 10,
                padding: '14px 16px',
                cursor: note ? 'pointer' : 'default',
                opacity: note ? 1 : 0.4,
              }}
              onClick={() => note && toggle(cat)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_EMOJI[cat]}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY }}>{cat}</span>
                </div>
                {priority && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: PRIORITY_COLOR[priority],
                    backgroundColor: PRIORITY_BG[priority],
                    border: `1px solid ${PRIORITY_COLOR[priority]}44`,
                    borderRadius: 4, padding: '2px 7px', flexShrink: 0,
                  }}>
                    {priority}
                  </span>
                )}
              </div>

              {note ? (
                <>
                  <p style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.5, margin: 0 }}>{note.summary}</p>
                  {isExpanded && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Key Findings</div>
                        <p style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.5, margin: 0 }}>{note.key_findings}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Coaching Meaning</div>
                        <p style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.5, margin: 0 }}>{note.coaching_meaning}</p>
                      </div>
                    </div>
                  )}
                  {note && (
                    <div style={{ marginTop: 8, fontSize: 10, color: TEXT_HINT }}>
                      {isExpanded ? '▲ Less' : '▼ More'}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 11, color: TEXT_HINT, margin: 0 }}>No data for this category</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
