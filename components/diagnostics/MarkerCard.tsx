'use client'
import { useState } from 'react'
import type { DiagnosticMarker, MarkerStatus } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { RangeBar } from './RangeBar'

interface Props {
  marker: DiagnosticMarker
  isCoach: boolean
  onNoteChange?: (markerId: string, note: string) => void
  compact?: boolean
}

const BORDER_COLORS: Record<MarkerStatus, string> = {
  'optimal':         '#1A4A2E',
  'borderline-low':  '#3D2E06',
  'borderline-high': '#3D2E06',
  'low':             '#3D1616',
  'high':            '#3D1616',
}

const BG_COLORS: Record<MarkerStatus, string> = {
  'optimal':         '#0A1E10',
  'borderline-low':  '#1E1808',
  'borderline-high': '#1E1808',
  'low':             '#1E0C0C',
  'high':            '#1E0C0C',
}

export function MarkerCard({ marker, isCoach, onNoteChange, compact = false }: Props) {
  const [note, setNote] = useState(marker.coach_note || '')

  const borderColor = BORDER_COLORS[marker.status]
  const bgColor = BG_COLORS[marker.status]

  const handleNoteBlur = () => {
    if (onNoteChange && note !== marker.coach_note) {
      onNoteChange(marker.id, note)
    }
  }

  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 10,
      padding: compact ? '12px 14px' : '16px 18px',
      marginBottom: compact ? 8 : 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <StatusBadge status={marker.status} />
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: '#E8F0FC' }}>
            {marker.marker_name}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#E8F0FC', marginTop: 2 }}>
            {marker.value}{' '}
            <span style={{ fontSize: 13, color: '#8A9AB8' }}>{marker.unit}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <div style={{ marginBottom: 10 }}>
          <RangeBar
            value={marker.value}
            refLow={marker.reference_range_low}
            refHigh={marker.reference_range_high}
            unit={marker.unit}
            status={marker.status}
          />
        </div>
      )}

      {marker.short_explanation && (
        <p style={{ fontSize: 12, color: '#C8D4E8', marginBottom: 8, lineHeight: 1.5 }}>
          {marker.short_explanation}
        </p>
      )}

      {isCoach ? (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Add your note on this marker…"
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
      ) : (
        marker.coach_note && (
          <div style={{
            borderLeft: '2px solid #B89A5C',
            paddingLeft: 10,
            fontSize: 12,
            color: '#C8D4E8',
            fontStyle: 'italic',
          }}>
            {marker.coach_note}
          </div>
        )
      )}
    </div>
  )
}
