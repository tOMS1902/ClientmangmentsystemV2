'use client'

import { useState, useEffect } from 'react'

interface WelcomeVideoProps {
  loomUrl: string
  viewCount: number
  clientName: string
}

function getLoomEmbedUrl(url: string): string {
  const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  if (!match) return url
  return `https://www.loom.com/embed/${match[1]}`
}

export function WelcomeVideo({ loomUrl, viewCount: initialViews, clientName }: WelcomeVideoProps) {
  const [views, setViews] = useState(initialViews)
  const [tracked, setTracked] = useState(false)

  const firstName = clientName.split(' ')[0]

  useEffect(() => {
    // Track view after 5 seconds of the component being mounted (proxy for "watched")
    if (tracked || views >= 2) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/welcome-video-view', { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setViews(data.views)
          setTracked(true)
        }
      } catch {}
    }, 5000)
    return () => clearTimeout(timer)
  }, [tracked, views])

  if (views >= 2) return null

  const embedUrl = getLoomEmbedUrl(loomUrl)

  return (
    <div className="bg-navy-card border border-gold/50 mb-6">
      <div className="p-4 border-b border-white/8">
        <p className="text-xs text-gold mb-0.5" style={{ fontFamily: 'var(--font-label)', letterSpacing: '2px' }}>WELCOME MESSAGE</p>
        <p className="text-white text-sm" style={{ fontFamily: 'var(--font-display)' }}>A personal message for you, {firstName}</p>
      </div>
      <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={embedUrl}
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
          style={{ border: 'none' }}
        />
      </div>
      <p className="text-grey-muted text-xs p-3 text-center">
        This message will disappear after {views >= 1 ? 'one more view' : '2 views'}
      </p>
    </div>
  )
}
