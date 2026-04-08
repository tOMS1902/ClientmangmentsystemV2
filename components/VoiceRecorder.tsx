'use client'

import { useState, useRef, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'

type RecorderState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done'

interface VoiceRecorderProps {
  clientId: string
  weekNumber: number
  type: 'weekly' | 'midweek'
  onComplete: (url: string) => void
  onDiscard: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceRecorder({ clientId, weekNumber, type, onComplete, onDiscard }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const recorded = new Blob(chunksRef.current, { type: mimeType })
        setBlob(recorded)
        const url = URL.createObjectURL(recorded)
        setPreviewUrl(url)
        setState('recorded')
      }

      recorder.start(250)
      setState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    mediaRecorderRef.current?.stop()
  }

  function discard() {
    setBlob(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setState('idle')
    setElapsed(0)
    onDiscard()
  }

  async function upload() {
    if (!blob) return
    setState('uploading')
    setError('')

    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const path = `${clientId}/${type}/${weekNumber}.${ext}`

      const supabase = createClientSupabaseClient()

      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(path, blob, { upsert: true, contentType: blob.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('voice-notes').getPublicUrl(path)
      setState('done')
      onComplete(data.publicUrl)
    } catch (err) {
      setError('Upload failed. Please try again.')
      setState('recorded')
      console.error('[VoiceRecorder] upload error:', err)
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Voice note attached
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-gold transition-colors"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          <span className="w-8 h-8 rounded-full border border-white/20 hover:border-gold flex items-center justify-center transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </span>
          Start recording
        </button>
      )}

      {state === 'recording' && (
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-white/85 text-sm tabular-nums">{formatTime(elapsed)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="text-xs border border-white/30 text-white/70 px-3 py-1.5 hover:border-gold hover:text-gold transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Stop
          </button>
        </div>
      )}

      {state === 'recorded' && previewUrl && (
        <div className="flex flex-col gap-2">
          <audio controls src={previewUrl} className="w-full h-8" style={{ accentColor: '#b8962e' }} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={upload}
              className="text-xs bg-gold text-navy-deep px-4 py-1.5 hover:bg-gold/90 transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Attach
            </button>
            <button
              type="button"
              onClick={() => { setState('idle'); setBlob(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) } }}
              className="text-xs text-grey-muted hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={discard}
              className="text-xs text-grey-muted hover:text-red-400 transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <p className="text-sm text-grey-muted">Uploading voice note...</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
