'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'

interface CoachSettingsProps {
  initialAvatarUrl: string | null
  coachName: string
  coachEmail: string
}

export function CoachSettings({ initialAvatarUrl, coachName, coachEmail }: CoachSettingsProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const initials = coachName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function save() {
    setSaving(true)
    const res = await fetch('/api/coach-avatar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl || null }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Saved' : 'Failed to save')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-navy-card border border-white/8 p-6">
        <Eyebrow className="block mb-4">Profile</Eyebrow>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full border border-gold/30 overflow-hidden flex items-center justify-center bg-navy-deep flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={coachName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gold text-lg font-semibold" style={{ fontFamily: 'var(--font-label)' }}>{initials}</span>
            )}
          </div>
          <div>
            <p className="text-white text-sm">{coachName}</p>
            <p className="text-grey-muted text-xs">{coachEmail}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-grey-muted" style={{ fontFamily: 'var(--font-label)' }}>PROFILE PHOTO URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://... (direct image URL)"
            className="bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <p className="text-grey-muted text-xs">Paste a direct image URL. This appears on the client&apos;s &quot;Message Coach&quot; button.</p>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Photo'}</Button>
            {msg && <span className="text-xs text-grey-muted">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
