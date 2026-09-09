'use client'

import type { SaveStatus } from '@/hooks/usePlanState'

interface SaveIndicatorProps {
  status: SaveStatus
  onRetry?: () => void
}

export function SaveIndicator({ status, onRetry }: SaveIndicatorProps) {
  if (status === 'idle') return null

  const config: Record<Exclude<SaveStatus, 'idle'>, { text: string; className: string }> = {
    saving: {
      text: 'Saving...',
      className: 'text-white/40 border-white/10',
    },
    saved: {
      text: 'Saved',
      className: 'text-emerald-400 border-emerald-500/20',
    },
    error: {
      text: 'Error — tap to retry',
      className: 'text-red-400 border-red-500/20 cursor-pointer hover:border-red-500/40',
    },
  }

  const { text, className } = config[status]

  return (
    <span
      onClick={status === 'error' ? onRetry : undefined}
      className={`text-[10px] px-2 py-0.5 border transition-colors ${className}`}
      style={{ fontFamily: 'var(--font-label)' }}
    >
      {status === 'saving' && (
        <span className="inline-block animate-pulse mr-1">●</span>
      )}
      {text}
    </span>
  )
}
