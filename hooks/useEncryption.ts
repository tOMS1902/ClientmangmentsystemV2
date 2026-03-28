'use client'

import { useCallback } from 'react'

// Encryption removed — Supabase RLS enforces message access control.
// Messages are stored as plaintext; only the authenticated coach and their specific client
// can access them via RLS policies. ECDH was removed because key loss (localStorage cleared,
// new device) made all previous messages permanently unreadable.
export function useEncryption(_myUserId: string | null, _otherProfileId: string | null) {
  const encrypt = useCallback(async (plaintext: string) => {
    return { ciphertext: plaintext, iv: null as unknown as string }
  }, [])

  const decrypt = useCallback(async (ciphertext: string, _iv: string): Promise<string> => {
    return ciphertext
  }, [])

  const encryptImageBytes = useCallback(async (data: ArrayBuffer) => {
    return { ciphertext: new Uint8Array(data), iv: '' }
  }, [])

  const decryptImageBytes = useCallback(async (ciphertext: ArrayBuffer, _iv: string): Promise<ArrayBuffer> => {
    return ciphertext
  }, [])

  return { ready: true, error: null, encrypt, decrypt, encryptImageBytes, decryptImageBytes }
}
