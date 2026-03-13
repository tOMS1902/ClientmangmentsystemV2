interface GoldRuleProps {
  className?: string
}

export function GoldRule({ className = '' }: GoldRuleProps) {
  return <span className={`gold-rule ${className}`} />
}
