import type { DiagnosticMarker } from '@/lib/types'

interface Props {
  markers: DiagnosticMarker[]
}

interface SummaryCardProps {
  title: string
  names: string[]
  color: string
  bg: string
  border: string
  emptyText: string
}

function SummaryCard({ title, names, color, bg, border, emptyText }: SummaryCardProps) {
  const shown = names.slice(0, 6)
  const extra = names.length - 6

  return (
    <div style={{
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: 10,
      padding: '14px 16px',
      flex: 1,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        marginBottom: 8,
      }}>
        {title}
      </div>
      {names.length === 0 ? (
        <div style={{ fontSize: 12, color: '#4A5A7A' }}>{emptyText}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {shown.map(name => (
              <span
                key={name}
                style={{
                  fontSize: 11,
                  color,
                  backgroundColor: `${color}18`,
                  border: `1px solid ${color}33`,
                  borderRadius: 4,
                  padding: '2px 7px',
                }}
              >
                {name}
              </span>
            ))}
          </div>
          {extra > 0 && (
            <div style={{ fontSize: 11, color: '#4A5A7A', marginTop: 6 }}>+{extra} more</div>
          )}
        </>
      )}
    </div>
  )
}

export function SummaryCards({ markers }: Props) {
  const optimal = markers
    .filter(m => m.status === 'optimal')
    .map(m => m.marker_name)

  const borderline = markers
    .filter(m => m.status === 'borderline-low' || m.status === 'borderline-high')
    .map(m => m.marker_name)

  const priority = markers
    .filter(m => m.status === 'low' || m.status === 'high')
    .map(m => m.marker_name)

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <SummaryCard
        title="What's looking good"
        names={optimal}
        color="#3ECF8E"
        bg="#0A1E10"
        border="#1A4A2E"
        emptyText="No optimal markers yet"
      />
      <SummaryCard
        title="Needs attention"
        names={borderline}
        color="#FBBF24"
        bg="#1E1808"
        border="#3D2E06"
        emptyText="None"
      />
      <SummaryCard
        title="Priority focus"
        names={priority}
        color="#F87171"
        bg="#1E0C0C"
        border="#3D1616"
        emptyText="None"
      />
    </div>
  )
}
