'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Which client needs attention this week?',
  'Who hasn\'t checked in recently?',
  'Who has declining energy scores?',
  'Summarise everyone\'s progress',
]

export function GlobalAIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function handleSend(text?: string) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || sending) return

    const userMsg: Message = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/coach-global-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: messages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to get reply')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setMessages(prev => prev.slice(0, -1))
      setInput(trimmed)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-navy-card border border-white/8">
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-gold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </span>
          <div>
            <p className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>AI Coach Assistant</p>
            <p className="text-grey-muted text-xs">Ask about any client or your full roster</p>
          </div>
        </div>
        <span className="text-grey-muted text-xs" style={{ fontFamily: 'var(--font-label)' }}>
          {open ? '▲ CLOSE' : '▼ OPEN'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/8 pt-5">
          {/* Suggestion chips — only when no messages */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={sending}
                  className="text-xs px-3 py-1.5 border border-gold/30 text-gold/80 hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="flex flex-col gap-3 mb-4 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-navy-mid border border-gold/30 text-white/90'
                        : 'bg-navy-deep border border-white/8 text-white/85'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.role === 'assistant' && (
                      <span className="text-gold text-xs block mb-1" style={{ fontFamily: 'var(--font-label)' }}>AI ASSISTANT</span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-navy-deep border border-white/8 px-4 py-3 text-sm text-grey-muted">
                    <span className="text-gold text-xs block mb-1" style={{ fontFamily: 'var(--font-label)' }}>AI ASSISTANT</span>
                    Thinking...
                  </div>
                </div>
              )}
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your clients... (Enter to send)"
              rows={2}
              disabled={sending}
              className="flex-1 bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted p-3 text-sm focus:outline-none focus:border-gold resize-none disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="px-4 py-2 bg-gold text-navy-deep text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors self-end"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
