'use client'

import { useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '@/lib/crypto'
import { storeKeyPair, loadPrivateKey, loadPublicKey } from '@/lib/keystore'

// Call this in layout components so keys are ready before Messages is ever opened.
export function useKeyInit() {
  useEffect(() => {
    async function init() {
      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let privBase64 = loadPrivateKey(user.id)
      let pubBase64 = loadPublicKey(user.id)

      if (!privBase64 || !pubBase64) {
        const pair = await generateKeyPair()
        privBase64 = await exportPrivateKey(pair.privateKey)
        pubBase64 = await exportPublicKey(pair.publicKey)
        storeKeyPair(user.id, privBase64, pubBase64)
      }

      // Upload public key — idempotent, safe to call on every load
      await fetch('/api/public-key', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubBase64 }),
      })
    }

    init().catch((err) => {
      console.error('[useKeyInit] Encryption key initialisation failed:', err)
    })
  }, [])
}
