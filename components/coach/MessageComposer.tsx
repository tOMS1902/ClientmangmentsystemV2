'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { MessageVoiceRecorder } from '@/components/MessageVoiceRecorder'

interface MessageComposerProps {
  clientId: string
  onSend: (body: string) => Promise<void>
  onSendImage?: (file: File) => Promise<void>
  onSendVoice?: (storagePath: string) => Promise<void>
  disabled?: boolean
}

export function MessageComposer({ clientId, onSend, onSendImage, onSendVoice, disabled }: MessageComposerProps) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    setBody('')
    try {
      await onSend(trimmed)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !onSendImage) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10 MB')
      return
    }
    setUploadingImage(true)
    try {
      await onSendImage(file)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleVoiceComplete(storagePath: string) {
    setShowRecorder(false)
    if (onSendVoice) await onSendVoice(storagePath)
  }

  const busy = sending || uploadingImage

  return (
    <div className="border-t border-white/8 pt-4">
      {showRecorder ? (
        <MessageVoiceRecorder
          clientId={clientId}
          onComplete={handleVoiceComplete}
          onDiscard={() => setShowRecorder(false)}
        />
      ) : (
        <>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || busy}
            rows={3}
            placeholder="Type a message… (Ctrl+Enter to send)"
            className="w-full bg-navy-deep border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none placeholder:text-grey-muted disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {onSendImage && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled || busy}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || busy}
                    title="Attach image (encrypted)"
                    className="p-2 text-grey-muted hover:text-gold transition-colors disabled:opacity-40"
                  >
                    {uploadingImage ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    )}
                  </button>
                </>
              )}
              {onSendVoice && (
                <button
                  type="button"
                  onClick={() => setShowRecorder(true)}
                  disabled={disabled || busy}
                  title="Send voice note"
                  className="p-2 text-grey-muted hover:text-gold transition-colors disabled:opacity-40"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!body.trim() || busy || disabled}
            >
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
