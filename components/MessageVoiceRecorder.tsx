'use client'

import { useState, useRef, useEffect } from 'react'

type RecorderState = 'idle' | 'recording' | 'recorded' | 'uploading'
type PermissionState = 'unknown' | 'granted' | 'prompt' | 'denied'

interface MessageVoiceRecorderProps {
  clientId: string
  onComplete: (storagePath: string) => void
  onDiscard: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MessageVoiceRecorder({ clientId, onComplete, onDiscard }: MessageVoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionState>('unknown')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check microphone permission state on mount
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('denied')
      return
    }
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(result => {
        setPermission(result.state as PermissionState)
        result.onchange = () => setPermission(result.state as PermissionState)
      })
      .catch(() => setPermission('unknown'))
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function startRecording() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Voice recording requires a secure connection (HTTPS or localhost).')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermission('granted')
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const recorded = new Blob(chunksRef.current, { type: mimeType })
        setBlob(recorded)
        setPreviewUrl(URL.createObjectURL(recorded))
        setState('recorded')
      }

      recorder.start(250)
      setState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied')
        setError('blocked')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Could not access microphone. Please check your browser settings.')
      }
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
  }

  function reRecord() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
    setElapsed(0)
    setState('idle')
  }

  async function upload() {
    if (!blob) return
    setState('uploading')
    setError('')
    try {
      const fd = new FormData()
      fd.append('audio', blob)
      const res = await fetch(`/api/messages/${clientId}/voice`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onComplete(data.path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('recorded')
    }
  }

  // Only block the UI if getUserMedia actually failed — not based on the Permissions API alone
  if (error === 'blocked') {
    return (
      <div className="flex flex-col gap-3 py-2 px-1">
        <div className="bg-navy-deep border border-amber-500/30 p-3 text-xs text-amber-400/90 leading-relaxed">
          <p className="font-semibold mb-1" style={{ fontFamily: 'var(--font-label)' }}>MICROPHONE BLOCKED</p>
          <p>To enable voice notes:</p>
          <ol className="mt-1 ml-3 list-decimal flex flex-col gap-0.5">
            <li>Click the <strong>lock icon</strong> in your browser address bar</li>
            <li>Find <strong>Microphone</strong> and set it to <strong>Allow</strong></li>
            <li>Click <strong>Try again</strong> below (no refresh needed)</li>
          </ol>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setError('')}
            className="text-xs text-gold border border-gold/40 px-3 py-1.5 hover:bg-gold/10 transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="text-xs text-grey-muted hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 py-2 px-1">
      {state === 'idle' && (
        <div className="flex flex-col gap-2">
          {permission === 'prompt' && (
            <p className="text-xs text-grey-muted">
              Your browser will ask for microphone access — click <strong className="text-white/70">Allow</strong> to continue.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 text-xs text-white/70 hover:text-gold transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              <span className="w-7 h-7 rounded-full border border-white/20 hover:border-gold flex items-center justify-center transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </span>
              Tap to record
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="text-xs text-grey-muted hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Cancel
            </button>
          </div>
        </div>
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
              Send
            </button>
            <button
              type="button"
              onClick={reRecord}
              className="text-xs text-grey-muted hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="text-xs text-grey-muted hover:text-red-400 transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <p className="text-sm text-grey-muted">Sending voice note…</p>
      )}

      {error && error !== 'blocked' && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
