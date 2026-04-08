'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { createClientSupabaseClient } from '@/lib/supabase/client'

interface CoachSettingsProps {
  initialAvatarUrl: string | null
  coachName: string
  coachEmail: string
  coachId: string
}

export function CoachSettings({ initialAvatarUrl, coachName, coachEmail, coachId }: CoachSettingsProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = coachName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMsg('')

    try {
      const supabase = createClientSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `${coachId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('coach-avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('coach-avatars')
        .getPublicUrl(path)

      // Save URL to profile
      const res = await fetch('/api/coach-avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })

      if (!res.ok) throw new Error('Failed to save')

      setAvatarUrl(publicUrl)
      setMsg('Photo updated')
    } catch {
      setMsg('Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => setMsg(''), 3000)
    }
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
          <label className="text-xs text-grey-muted" style={{ fontFamily: 'var(--font-label)' }}>PROFILE PHOTO</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
            {msg && <span className="text-xs text-grey-muted">{msg}</span>}
          </div>
          <p className="text-grey-muted text-xs">JPEG, PNG or WebP. This appears on the client&apos;s &quot;Message Coach&quot; button.</p>
        </div>
      </div>
    </div>
  )
}
