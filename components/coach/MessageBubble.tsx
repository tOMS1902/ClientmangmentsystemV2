'use client'

import { useState, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { VoicePlayer } from '@/components/VoicePlayer'
import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
  decryptedBody: string
  viewerRole: 'coach' | 'client'
  decryptImageBytes?: (ciphertext: ArrayBuffer, iv: string) => Promise<ArrayBuffer>
}

interface ImagePayload {
  type: 'image'
  path: string
  imageIv: string
}

function parseImagePayload(body: string): ImagePayload | null {
  try {
    const parsed = JSON.parse(body)
    if (parsed?.type === 'image' && typeof parsed.path === 'string' && typeof parsed.imageIv === 'string') {
      return parsed as ImagePayload
    }
  } catch { /* not JSON */ }
  return null
}

function EncryptedImage({
  payload,
  isSelf,
  decryptImageBytes,
}: {
  payload: ImagePayload
  isSelf: boolean
  decryptImageBytes: (ciphertext: ArrayBuffer, iv: string) => Promise<ArrayBuffer>
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null
    async function load() {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error: dlErr } = await supabase.storage
          .from('chat-images')
          .download(payload.path)
        if (dlErr || !data) { setError(true); return }
        const encrypted = await data.arrayBuffer()
        const plain = await decryptImageBytes(encrypted, payload.imageIv)
        url = URL.createObjectURL(new Blob([plain]))
        setObjectUrl(url)
      } catch {
        setError(true)
      }
    }
    load()
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [payload.path, payload.imageIv, decryptImageBytes])

  if (error) return <p className="text-xs opacity-60">[Could not load image]</p>
  if (!objectUrl) {
    return (
      <div className={`w-48 h-32 flex items-center justify-center text-xs opacity-60 ${isSelf ? 'bg-gold/20' : 'bg-white/5'}`}>
        Decrypting…
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={objectUrl} alt="Encrypted image" className="max-w-[260px] max-h-[300px] object-contain rounded" />
  )
}

function VoiceNote({ storagePath, isSelf }: { storagePath: string; isSelf: boolean }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/messages/voice-sign?path=${encodeURIComponent(storagePath)}`)
        if (!res.ok) { setError(true); return }
        const { url } = await res.json()
        setSignedUrl(url)
      } catch {
        setError(true)
      }
    }
    load()
  }, [storagePath])

  if (error) return <p className="text-xs opacity-60">[Could not load voice note]</p>
  if (!signedUrl) {
    return (
      <p className={`text-xs ${isSelf ? 'text-navy-deep/60' : 'text-grey-muted'}`}>
        Loading…
      </p>
    )
  }
  return <VoicePlayer url={signedUrl} />
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, decryptedBody, viewerRole, decryptImageBytes }: MessageBubbleProps) {
  const isSelf = message.sender_role === viewerRole
  const imagePayload = !message.voice_url ? parseImagePayload(decryptedBody) : null

  return (
    <div className={`flex mb-3 ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-4 py-3 text-sm ${
          isSelf
            ? 'bg-gold text-navy-deep'
            : 'bg-navy-card border border-white/8 text-white/85'
        }`}
      >
        {message.voice_url ? (
          <VoiceNote storagePath={message.voice_url} isSelf={isSelf} />
        ) : imagePayload && decryptImageBytes ? (
          <EncryptedImage payload={imagePayload} isSelf={isSelf} decryptImageBytes={decryptImageBytes} />
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{decryptedBody}</p>
        )}
        <p className={`text-[10px] mt-1.5 ${isSelf ? 'text-navy-deep/60' : 'text-grey-muted'}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
