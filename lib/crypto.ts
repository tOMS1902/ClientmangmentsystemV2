// End-to-end encryption using ECDH P-256 key agreement + AES-GCM-256
// All operations run in the browser via the Web Crypto API.
// Private keys never leave the device. The server only ever stores ciphertext + IV.

const EC_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }
const AES_PARAMS: AesKeyGenParams = { name: 'AES-GCM', length: 256 }

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(EC_PARAMS, true, ['deriveKey'])
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return bufToBase64(await crypto.subtle.exportKey('spki', key))
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  return bufToBase64(await crypto.subtle.exportKey('pkcs8', key))
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', base64ToBuf(b64), EC_PARAMS, true, [])
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', base64ToBuf(b64), EC_PARAMS, false, ['deriveKey'])
}

// Both parties independently derive the same AES key from their own private key
// and the other party's public key — no key is ever transmitted.
export async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    AES_PARAMS,
    false,        // non-extractable — the shared key cannot be exported
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    new TextEncoder().encode(plaintext)
  )
  return { ciphertext: bufToBase64(cipherBuf), iv: bufToBase64(iv.buffer as ArrayBuffer) }
}

export async function decryptMessage(
  sharedKey: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(iv) },
    sharedKey,
    base64ToBuf(ciphertext)
  )
  return new TextDecoder().decode(plainBuf)
}

// Encrypt raw binary data (for images). Returns raw ciphertext bytes + base64 IV.
export async function encryptBytes(
  sharedKey: CryptoKey,
  data: ArrayBuffer
): Promise<{ ciphertext: Uint8Array; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    data
  )
  return { ciphertext: new Uint8Array(cipherBuf), iv: bufToBase64(iv.buffer as ArrayBuffer) }
}

// Decrypt raw binary data (for images).
export async function decryptBytes(
  sharedKey: CryptoKey,
  ciphertext: ArrayBuffer,
  iv: string
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(iv) },
    sharedKey,
    ciphertext
  )
}
