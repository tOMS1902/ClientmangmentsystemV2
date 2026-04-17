'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { MessageBubble } from '@/components/coach/MessageBubble'
import { MessageComposer } from '@/components/coach/MessageComposer'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useEncryption } from '@/hooks/useEncryption'
import type { Message } from '@/lib/types'

interface MessagingTabProps {
  clientId: string
  clientName: string
  clientUserId: string | null  // client's auth user ID (profiles.id) for key exchange
}

export function MessagingTab({ clientId, clientName, clientUserId }: MessagingTabProps) {
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [decryptedBodies, setDecryptedBodies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClientSupabaseClient()
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => setMyUserId(data.user?.id ?? null))
  }, [])

  const { ready: encReady, error: encError, encrypt, decrypt, encryptImageBytes, decryptImageBytes } = useEncryption(myUserId, clientUserId)

  const decryptAll = useCallback(async (msgs: Message[]) => {
    const result: Record<string, string> = {}
    await Promise.all(msgs.map(async msg => {
      if (!msg.iv) { result[msg.id] = msg.body; return }
      try { result[msg.id] = await decrypt(msg.body, msg.iv) }
      catch { result[msg.id] = '[Could not decrypt]' }
    }))
    return result
  }, [decrypt])

  const markRead = useCallback(() => {
    fetch(`/api/messages/${clientId}/read`, { method: 'POST' })
  }, [clientId])

  useEffect(() => {
    if (!encReady) return
    async function load() {
      const res = await fetch(`/api/messages/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setHasMore(data.hasMore)
        setDecryptedBodies(await decryptAll(data.messages))
      }
      setLoading(false)
      markRead()
    }
    load()
  }, [clientId, encReady, decryptAll, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!encReady) return
    const supabase = createClientSupabaseClient()
    const channel = supabase
      .channel(`messages:${clientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${clientId}`,
      }, async (payload: { new: unknown }) => {
        const newMsg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        let body = '[Could not decrypt]'
        if (newMsg.iv) {
          try { body = await decrypt(newMsg.body, newMsg.iv) } catch { /* use fallback */ }
        }
        setDecryptedBodies(prev => ({ ...prev, [newMsg.id]: body }))
        if (newMsg.sender_role === 'client') markRead()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, encReady, decrypt, markRead])

  async function loadMore() {
    if (!messages[0] || loadingMore || !encReady) return
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

  async function handleSendVoice(storagePath: string) {
    const res = await fetch(`/api/messages/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '', voice_url: storagePath }),
    })
    if (res.ok) {
      const newMsg: Message = await res.json()
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
      setDecryptedBodies(prev => ({ ...prev, [newMsg.id]: '' }))
    }
  }

  const canMessage = encReady && !encError

  return (
    <div className="flex flex-col" style={{ height: '60vh' }}>
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Messages — {clientName}</Eyebrow>
      </div>

      <div className="flex-1 overflow-y-auto bg-navy-card border border-white/8 p-4 flex flex-col">
        {!clientUserId ? (
          <p className="text-grey-muted text-sm m-auto">Client has not created an account yet — messaging unavailable.</p>
        ) : encError ? (
          <p className="text-amber-400 text-sm m-auto">{encError}</p>
        ) : loading || !encReady ? (
          <p className="text-grey-muted text-sm m-auto">Loading messages…</p>
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
              <p className="text-grey-muted text-sm m-auto">No messages yet. Send the first one below.</p>
            )}
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                decryptedBody={decryptedBodies[msg.id] ?? '…'}
                viewerRole="coach"
                decryptImageBytes={decryptImageBytes}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="mt-4">
        <MessageComposer clientId={clientId} onSend={handleSend} onSendImage={canMessage ? handleSendImage : undefined} onSendVoice={canMessage ? handleSendVoice : undefined} disabled={!canMessage} />
      </div>
    </div>
  )
}
