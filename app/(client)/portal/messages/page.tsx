'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { MessageBubble } from '@/components/coach/MessageBubble'
import { MessageComposer } from '@/components/coach/MessageComposer'
import { useEncryption } from '@/hooks/useEncryption'
import type { Message } from '@/lib/types'

export default function MessagesPage() {
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [decryptedBodies, setDecryptedBodies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // coachId is the other party for ECDH key exchange
  const { ready: encReady, error: encError, encrypt, decrypt, encryptImageBytes, decryptImageBytes } = useEncryption(myUserId, coachId)

  useEffect(() => {
    async function init() {
      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setInitError('Not authenticated'); setLoading(false); return }
      setMyUserId(user.id)

      const meRes = await fetch('/api/messages/me')
      if (!meRes.ok) { setInitError('Could not load messaging info'); setLoading(false); return }
      const { clientId: cid, coachId: coid } = await meRes.json()
      setClientId(cid)
      setCoachId(coid)
    }
    init()
  }, [])

  const decryptAll = useCallback(async (msgs: Message[]) => {
    const result: Record<string, string> = {}
    await Promise.all(msgs.map(async msg => {
      if (!msg.iv) { result[msg.id] = msg.body; return }
      try { result[msg.id] = await decrypt(msg.body, msg.iv) }
      catch { result[msg.id] = '[Could not decrypt]' }
    }))
    return result
  }, [decrypt])

  const markRead = useCallback((cid: string) => {
    fetch(`/api/messages/${cid}/read`, { method: 'POST' })
  }, [])

  useEffect(() => {
    if (!encReady || !clientId) return
    async function load() {
      const res = await fetch(`/api/messages/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setHasMore(data.hasMore)
        setDecryptedBodies(await decryptAll(data.messages))
        markRead(clientId!)
      }
      setLoading(false)
    }
    load()
  }, [clientId, encReady, decryptAll, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!encReady || !clientId) return
    const supabase = createClientSupabaseClient()
    const channel = supabase
      .channel(`messages-client:${clientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${clientId}`,
      }, async payload => {
        const newMsg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        let body = '[Could not decrypt]'
        if (newMsg.iv) {
          try { body = await decrypt(newMsg.body, newMsg.iv) } catch { /* use fallback */ }
        }
        setDecryptedBodies(prev => ({ ...prev, [newMsg.id]: body }))
        if (newMsg.sender_role === 'coach') markRead(clientId)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, encReady, decrypt, markRead])

  async function loadMore() {
    if (!clientId || !messages[0] || loadingMore || !encReady) return
    setLoadingMore(true)
    const res = await fetch(`/api/messages/${clientId}?before=${encodeURIComponent(messages[0].created_at)}`)
    if (res.ok) {
      const data = await res.json()
      const decrypted = await decryptAll(data.messages)
      setMessages(prev => [...data.messages, ...prev])
      setDecryptedBodies(prev => ({ ...prev, ...decrypted }))
      setHasMore(data.hasMore)
    }
    setLoadingMore(false)
  }

  async function handleSend(plaintext: string) {
    if (!clientId) return
    const { ciphertext, iv } = await encrypt(plaintext)
    const res = await fetch(`/api/messages/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: ciphertext, iv }),
    })
    if (res.ok) {
      const newMsg: Message = await res.json()
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
      setDecryptedBodies(prev => ({ ...prev, [newMsg.id]: plaintext }))
    }
  }

  async function handleSendImage(file: File) {
    if (!clientId) return
    const buf = await file.arrayBuffer()
    const { ciphertext, iv: imageIv } = await encryptImageBytes(buf)
    const supabase = (await import('@/lib/supabase/client')).createClientSupabaseClient()
    const fileName = `${clientId}/${crypto.randomUUID()}.enc`
    const { data, error: uploadErr } = await supabase.storage
      .from('chat-images')
      .upload(fileName, ciphertext, { contentType: 'application/octet-stream' })
    if (uploadErr || !data) {
      console.error('Image upload failed', uploadErr)
      return
    }
    await handleSend(JSON.stringify({ type: 'image', path: data.path, imageIv }))
  }

  const canMessage = encReady && !encError && !!clientId

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Messages
        </h1>
      </div>

      {initError ? (
        <p className="text-grey-muted text-sm">{initError}</p>
      ) : (
        <div className="flex flex-col" style={{ height: '65vh' }}>
          <div className="flex-1 overflow-y-auto bg-navy-card border border-white/8 p-4 flex flex-col">
            {encError ? (
              <p className="text-amber-400 text-sm m-auto">{encError}</p>
            ) : loading || !encReady ? (
              <p className="text-grey-muted text-sm m-auto">Setting up encrypted channel…</p>
            ) : (
              <>
                {hasMore && (
                  <button onClick={loadMore} disabled={loadingMore}
                    className="text-xs text-grey-muted hover:text-white mb-4 self-center transition-colors"
                    style={{ fontFamily: 'var(--font-label)' }}>
                    {loadingMore ? 'Loading…' : 'Load earlier messages'}
                  </button>
                )}
                {messages.length === 0 && (
                  <p className="text-grey-muted text-sm m-auto">No messages yet. Your coach will reply here.</p>
                )}
                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    decryptedBody={decryptedBodies[msg.id] ?? '…'}
                    viewerRole="client"
                    decryptImageBytes={decryptImageBytes}
                  />
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="mt-4">
            <MessageComposer onSend={handleSend} onSendImage={canMessage ? handleSendImage : undefined} disabled={!canMessage} />
          </div>
        </div>
      )}

      <div className="mt-4 border border-white/8 bg-navy-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/85" style={{ fontFamily: 'var(--font-label)' }}>MONTHLY CHECK-IN CALL</p>
          <p className="text-xs text-grey-muted mt-0.5">Book your monthly 1-to-1 call with your coach</p>
        </div>
        <a
          href="https://calendly.com/calumfraserfitness/monthly-check-in-call"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold border border-gold/40 px-3 py-1.5 hover:bg-gold/10 transition-colors flex-shrink-0"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          Book a Call →
        </a>
      </div>
    </div>
  )
}
