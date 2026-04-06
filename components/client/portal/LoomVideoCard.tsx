interface LoomVideoCardProps {
  loomUrl: string
  weekNumber: number
}

function getLoomEmbedUrl(url: string): string {
  // Loom URLs: https://www.loom.com/share/VIDEO_ID or https://loom.com/share/VIDEO_ID
  const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  if (!match) return url
  return `https://www.loom.com/embed/${match[1]}`
}

export function LoomVideoCard({ loomUrl, weekNumber }: LoomVideoCardProps) {
  const embedUrl = getLoomEmbedUrl(loomUrl)

  return (
    <div className="bg-navy-card border border-gold/30">
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <div>
          <p className="text-xs text-gold mb-0.5" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>COACH MESSAGE</p>
          <p className="text-white text-sm" style={{ fontFamily: 'var(--font-display)' }}>Week {weekNumber} — From Your Coach</p>
        </div>
      </div>
      <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={embedUrl}
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  )
}
