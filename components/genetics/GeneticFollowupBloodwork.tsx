const RAISED = '#131929', BORDER = '#1A2A40'
const TEXT_HINT = '#4A5A7A', AMBER = '#FBBF24'

interface Props {
  markers: string[]
}

export function GeneticFollowupBloodwork({ markers }: Props) {
  if (!markers || markers.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        🩸 Bloodwork to Monitor
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {markers.map((marker, i) => (
          <span
            key={i}
            style={{
              backgroundColor: '#1E1808', border: `1px solid #3D2E06`,
              borderRadius: 20, padding: '5px 12px',
              fontSize: 12, color: AMBER,
            }}
          >
            {marker}
          </span>
        ))}
      </div>
    </div>
  )
}
