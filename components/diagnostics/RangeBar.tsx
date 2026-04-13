import type { MarkerStatus } from '@/lib/types'

interface Props {
  value: number
  refLow: number
  refHigh: number
  unit: string
  status: MarkerStatus
}

const STATUS_COLORS: Record<MarkerStatus, string> = {
  'optimal':         '#3ECF8E',
  'borderline-low':  '#FBBF24',
  'borderline-high': '#FBBF24',
  'low':             '#F87171',
  'high':            '#F87171',
}

export function RangeBar({ value, refLow, refHigh, unit, status }: Props) {
  if (refLow === refHigh) {
    return (
      <div style={{ color: '#8A9AB8', fontSize: 11 }}>No range available</div>
    )
  }

  const pad = (refHigh - refLow) * 0.3
  const barMin = refLow - pad
  const barMax = refHigh + pad
  const totalRange = barMax - barMin

  const rawDot = ((value - barMin) / totalRange) * 100
  const dotPct = Math.min(100, Math.max(0, rawDot))
  const lowZonePct = Math.max(0, ((refLow - barMin) / totalRange) * 100)
  const highZoneStart = Math.min(100, ((refHigh - barMin) / totalRange) * 100)
  const midZonePct = Math.max(0, highZoneStart - lowZonePct)
  const rightZonePct = Math.max(0, 100 - highZoneStart)

  const dotColor = STATUS_COLORS[status]
  const isDotClamped = rawDot < 0 || rawDot > 100

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Bar */}
      <div style={{
        position: 'relative',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        marginBottom: 4,
      }}>
        <div style={{ width: `${lowZonePct}%`, backgroundColor: '#3D1616', flexShrink: 0 }} />
        <div style={{ width: `${midZonePct}%`, backgroundColor: '#1A4A2E', flexShrink: 0 }} />
        <div style={{ width: `${rightZonePct}%`, backgroundColor: '#3D1616', flexShrink: 0 }} />
        {/* Dot */}
        <div style={{
          position: 'absolute',
          left: `calc(${dotPct}% - 6px)`,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: `0 0 8px ${dotColor}55`,
          zIndex: 2,
          border: '2px solid rgba(255,255,255,0.15)',
        }} />
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4A5A7A' }}>
        <span>{refLow.toLocaleString()}</span>
        <span style={{ color: '#3ECF8E' }}>optimal {refLow}–{refHigh} {unit}</span>
        <span>{refHigh.toLocaleString()}</span>
      </div>
      {isDotClamped && (
        <div style={{ fontSize: 10, color: '#8A9AB8', marginTop: 2 }}>
          Value: {value} {unit}
        </div>
      )}
    </div>
  )
}
