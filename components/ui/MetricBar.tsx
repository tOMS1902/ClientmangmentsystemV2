interface MetricBarProps {
  label: string
  value: number
  target: number
  unit: string
  color?: string
}

export function MetricBar({ label, value, target, unit, color }: MetricBarProps) {
  const percentage = Math.min((value / target) * 100, 100)
  const isOnTarget = value >= target
  const barColor = color || (isOnTarget ? '#22c55e' : '#b8962e')

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-grey-muted">{label}</span>
        <span className="text-sm text-white/85">
          <span className="font-semibold">{value.toLocaleString()}</span>
          <span className="text-grey-muted"> / {target.toLocaleString()} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-navy-deep w-full">
        <div
          className="h-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}
