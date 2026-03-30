'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-navy-dark">
          <div className="text-center p-8">
            <h2 className="text-2xl text-white mb-4">Something went wrong</h2>
            <button
              onClick={reset}
              className="px-4 py-2 border border-gold text-gold hover:bg-gold/10 transition-colors text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
