const RAISED = '#131929', BORDER = '#1A2A40'
const TEXT_MUTED = '#8A9AB8', TEXT_HINT = '#4A5A7A', GREEN = '#3ECF8E'

interface Props {
  items: string[]
}

export function GeneticGroceryList({ items }: Props) {
  if (!items || items.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        🛒 DNA-Based Grocery List
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              backgroundColor: RAISED, border: `1px solid ${BORDER}`,
              borderRadius: 20, padding: '5px 12px',
              fontSize: 12, color: TEXT_MUTED,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
