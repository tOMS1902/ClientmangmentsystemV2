import type { GeneticData } from '@/lib/types'

const SURFACE = '#0F1827', RAISED = '#131929', BORDER = '#1A2A40'
const TEXT_SECONDARY = '#C8D4E8', TEXT_HINT = '#4A5A7A', GOLD = '#B89A5C'

interface Props {
  recommendations: GeneticData['recommendations']
}

const REC_FIELDS: { key: keyof GeneticData['recommendations']; label: string; emoji: string }[] = [
  { key: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { key: 'training', label: 'Training Adjustments', emoji: '🏋️' },
  { key: 'recovery', label: 'Recovery & Sleep', emoji: '😴' },
  { key: 'supplements', label: 'Supplements', emoji: '💊' },
]

export function GeneticRecommendations({ recommendations }: Props) {
  const filled = REC_FIELDS.filter(f => recommendations[f.key]?.trim())
  if (filled.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_HINT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Recommendations
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {filled.map(({ key, label, emoji }) => (
          <div key={key} style={{
            backgroundColor: RAISED, border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {emoji} {label}
            </div>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.6, margin: 0 }}>
              {recommendations[key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
