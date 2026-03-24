'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  generateKeyPair, exportPublicKey, exportPrivateKey,
  importPublicKey, importPrivateKey, deriveSharedKey,
  encryptMessage, decryptMessage, encryptBytes, decryptBytes,
} from '@/lib/crypto'
import { storeKeyPair, loadPrivateKey, loadPublicKey } from '@/lib/keystore'

async function uploadPublicKey(publicBase64: string) {
  await fetch('/api/public-key', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicBase64 }),
  })
}

export function useEncryption(myUserId: string | null, otherProfileId: string | null) {
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!myUserId || !otherProfileId) return
    let cancelled = false

    async function init() {
      // 1. Load or generate my key pair
      let privBase64 = loadPrivateKey(myUserId!)
      let pubBase64 = loadPublicKey(myUserId!)

      if (!privBase64 || !pubBase64) {
        // Generate fresh key pair
        const pair = await generateKeyPair()
        privBase64 = await exportPrivateKey(pair.privateKey)
        pubBase64 = await exportPublicKey(pair.publicKey)
        storeKeyPair(myUserId!, privBase64, pubBase64)
      }

      // Always re-upload public key — idempotent, ensures DB is in sync
      // even if a previous upload failed silently
      await uploadPublicKey(pubBase64)

      // 2. Fetch the other party's public key
      const res = await fetch(`/api/public-key/${otherProfileId}`)
      const resBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (!cancelled) setError(`Key lookup failed (${res.status}): ${resBody?.error ?? 'unknown'}`)
        return
      }

      const { publicKey: otherPubBase64 } = resBody
      if (!otherPubBase64) {
        if (!cancelled) setError('Other party has not set up encryption yet — ask them to open Messages first.')
        return
      }

      // 3. Derive shared AES key via ECDH — no key is ever transmitted
      const myPrivKey = await importPrivateKey(privBase64)
      const otherPubKey = await importPublicKey(otherPubBase64)
      const shared = await deriveSharedKey(myPrivKey, otherPubKey)

      if (!cancelled) {
        setSharedKey(shared)
        setReady(true)
      }
    }

    init().catch(e => { if (!cancelled) setError(e?.message ?? 'Encryption setup failed') })
    return () => { cancelled = true }
  }, [myUserId, otherProfileId])

  const encrypt = useCallback(async (plaintext: string) => {
    if (!sharedKey) throw new Error('Encryption not ready')
    return encryptMessage(sharedKey, plaintext)
  }, [sharedKey])

  const decrypt = useCallback(async (ciphertext: string, iv: string): Promise<string> => {
    if (!sharedKey) throw new Error('Encryption not ready')
    return decryptMessage(sharedKey, ciphertext, iv)
  }, [sharedKey])

  const encryptImageBytes = useCallback(async (data: ArrayBuffer) => {
    if (!sharedKey) throw new Error('Encryption not ready')
    return encryptBytes(sharedKey, data)
  }, [sharedKey])

  const decryptImageBytes = useCallback(async (ciphertext: ArrayBuffer, iv: string): Promise<ArrayBuffer> => {
    if (!sharedKey) throw new Error('Encryption not ready')
    return decryptBytes(sharedKey, ciphertext, iv)
  }, [sharedKey])

  return { ready, error, encrypt, decrypt, encryptImageBytes, decryptImageBytes }
}
