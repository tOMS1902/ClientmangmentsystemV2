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
