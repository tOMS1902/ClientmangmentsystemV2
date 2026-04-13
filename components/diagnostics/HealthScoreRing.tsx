interface Props {
  score: number  // 0–100
  size?: number
}

export function HealthScoreRing({ score, size = 100 }: Props) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#3ECF8E' : score >= 60 ? '#FBBF24' : '#F87171'

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', position: 'absolute' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A2A40"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontSize: Math.round(size * 0.24),
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}>
          {score}
        </div>
        <div style={{
          fontSize: Math.round(size * 0.1),
          color: '#8A9AB8',
          marginTop: 2,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Score
        </div>
      </div>
    </div>
  )
}
