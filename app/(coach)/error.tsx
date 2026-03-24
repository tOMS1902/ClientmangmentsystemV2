'use client'

import { useEffect } from 'react'

export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[CoachPortal] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <p className="text-xs tracking-widest text-gold uppercase" style={{ fontFamily: 'var(--font-label)' }}>
        Something went wrong
      </p>
      <h1 className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
        An unexpected error occurred
      </h1>
      <p className="text-grey-muted text-sm max-w-sm">
        {error.message ?? 'Please try again or contact support if the problem persists.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 border border-gold text-gold text-sm hover:bg-gold hover:text-navy-deep transition-colors"
        style={{ fontFamily: 'var(--font-label)' }}
      >
        Try Again
      </button>
    </div>
  )
}
