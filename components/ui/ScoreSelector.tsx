'use client'

interface ScoreSelectorProps {
  value: number | null
  onChange: (v: number) => void
  label?: string
}

export function ScoreSelector({ value, onChange, label }: ScoreSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm text-white/85">{label}</span>}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`w-12 h-12 flex items-center justify-center text-sm font-semibold transition-colors cursor-pointer ${
              value === num
                ? 'bg-gold text-navy-deep'
                : 'bg-navy-card border border-grey-muted text-white/85 hover:border-gold'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  )
}
