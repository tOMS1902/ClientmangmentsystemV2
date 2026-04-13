'use client'
import type { MarkerStatus, InsightPriority } from '@/lib/types'

interface Props {
  status?: MarkerStatus
  priority?: InsightPriority
}

const STATUS_CONFIG: Record<MarkerStatus, { label: string; color: string; bg: string }> = {
  'optimal':         { label: 'OPTIMAL',          color: '#3ECF8E', bg: '#0A1E10' },
  'borderline-low':  { label: 'BORDERLINE LOW',   color: '#FBBF24', bg: '#1E1808' },
  'borderline-high': { label: 'BORDERLINE HIGH',  color: '#FBBF24', bg: '#1E1808' },
  'low':             { label: 'LOW',               color: '#F87171', bg: '#1E0C0C' },
  'high':            { label: 'HIGH',              color: '#F87171', bg: '#1E0C0C' },
}

const PRIORITY_CONFIG: Record<InsightPriority, { label: string; color: string; bg: string }> = {
  'high':   { label: 'HIGH',   color: '#F87171', bg: '#1E0C0C' },
  'medium': { label: 'MEDIUM', color: '#FBBF24', bg: '#1E1808' },
  'low':    { label: 'LOW',    color: '#3ECF8E', bg: '#0A1E10' },
}

export function StatusBadge({ status, priority }: Props) {
  const cfg = status ? STATUS_CONFIG[status] : priority ? PRIORITY_CONFIG[priority] : null
  if (!cfg) return null

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: cfg.color,
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.label}
    </span>
  )
}
