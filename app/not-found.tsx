import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy-deep gap-6 text-center px-4">
      <p className="text-xs tracking-widest text-gold uppercase" style={{ fontFamily: 'var(--font-label)' }}>
        404
      </p>
      <h1 className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
        Page Not Found
      </h1>
      <p className="text-grey-muted text-sm max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 border border-gold text-gold text-sm hover:bg-gold hover:text-navy-deep transition-colors"
        style={{ fontFamily: 'var(--font-label)' }}
      >
        Go Home
      </Link>
    </div>
  )
}
