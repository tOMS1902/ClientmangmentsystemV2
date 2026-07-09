interface NextCallWidgetProps {
  nextCallAt: string
  nextCallLink?: string | null
  nextCallNotes?: string | null
}

function formatCallTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function NextCallWidget({ nextCallAt, nextCallLink, nextCallNotes }: NextCallWidgetProps) {
  return (
    <div className="bg-navy-card border border-gold/30 p-5 mb-8">
      <p className="text-xs text-gold mb-3" style={{ fontFamily: 'var(--font-label)', letterSpacing: '1px' }}>
        NEXT CALL
      </p>
      <p className="text-white text-base mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        {formatCallTime(nextCallAt)}
      </p>
      {nextCallNotes && (
        <p className="text-grey-muted text-sm mb-3">{nextCallNotes}</p>
      )}
      {nextCallLink && (
        <a
          href={nextCallLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-gold border border-gold/40 px-4 py-2 hover:bg-gold/10 transition-colors"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          Join Call →
        </a>
      )}
    </div>
  )
}
