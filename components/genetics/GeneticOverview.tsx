// No 'use client' needed — pure display
import type { GeneticData } from '@/lib/types'

interface Props {
  overview: string
  topPriorities: string[]
}

export function GeneticOverview({ overview, topPriorities }: Props) {
  const SURFACE = '#0F1827', RAISED = '#131929', BORDER = '#1A2A40'
  const TEXT_PRIMARY = '#E8F0FC', TEXT_SECONDARY = '#C8D4E8', TEXT_MUTED = '#8A9AB8', TEXT_HINT = '#4A5A7A'
  const GOLD = '#B89A5C', GREEN = '#3ECF8E', AMBER = '#FBBF24', RED = '#F87171'

  const priorityColors = ['#F87171', '#FBBF24', '#3ECF8E', '#a78bfa', '#38bdf8']

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Overview card */}
      <div style={{
        backgroundColor: SURFACE, border: `1px solid ${GOLD}44`,
        borderLeft: `3px solid ${GOLD}`, borderRadius: 12,
        padding: '20px 24px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Overview
        </div>
        <p style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.7, margin: 0 }}>{overview || 'No overview added yet.'}</p>
      </div>

      {/* Top priorities */}
      {topPriorities.length > 0 && (
        <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Top Priorities
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPriorities.slice(0, 5).map((priority, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: `${priorityColors[i]}22`,
                  border: `1px solid ${priorityColors[i]}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: priorityColors[i],
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 13, color: TEXT_PRIMARY, lineHeight: 1.5, margin: 0 }}>{priority}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
