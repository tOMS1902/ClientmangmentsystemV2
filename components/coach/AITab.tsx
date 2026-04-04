'use client'

import { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface AITabProps {
  clientId: string
  clientName: string
}

export function AITab({ clientId, clientName }: AITabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/ai/coach-chat/${clientId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load chat history.')
        setLoading(false)
      })
  }, [clientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to get reply')
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, assistantMsg])
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

  const firstName = clientName.split(' ')[0]

  return (
    <div className="flex flex-col" style={{ height: '600px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/8">
        <span className="text-gold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </span>
        <div>
          <p className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>
            AI Coach Assistant
          </p>
          <p className="text-grey-muted text-xs">Ask anything about {firstName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 mb-4">
        {loading && (
          <p className="text-grey-muted text-sm text-center mt-8">Loading history...</p>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-grey-muted text-sm mb-2">No messages yet.</p>
            <p className="text-grey-muted text-xs">Ask about {firstName}&apos;s progress, trends, or what to focus on next.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={msg.id ?? i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-navy-card border border-gold/30 text-white/90'
                  : 'bg-navy-mid border border-white/8 text-white/85'
              }`}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {msg.role === 'assistant' && (
                <span className="text-gold text-xs block mb-1" style={{ fontFamily: 'var(--font-label)' }}>
                  AI ASSISTANT
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-navy-mid border border-white/8 px-4 py-3 text-sm text-grey-muted">
              <span className="text-gold text-xs block mb-1" style={{ fontFamily: 'var(--font-label)' }}>AI ASSISTANT</span>
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/8 pt-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${firstName}... (Enter to send, Shift+Enter for new line)`}
            rows={2}
            disabled={sending}
            className="flex-1 bg-navy-deep border border-white/20 text-white/85 placeholder:text-grey-muted p-3 text-sm focus:outline-none focus:border-gold resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-gold text-navy-deep text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors self-end"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-grey-muted text-xs mt-2">Messages are saved and persist between sessions.</p>
      </div>
    </div>
  )
}
