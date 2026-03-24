// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  exportPrivateKey,
  importPrivateKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
} from '@/lib/crypto'

describe('generateKeyPair', () => {
  it('generates a non-null key pair with public and private keys', async () => {
    const pair = await generateKeyPair()
    expect(pair).not.toBeNull()
    expect(pair.publicKey).toBeDefined()
    expect(pair.privateKey).toBeDefined()
  })

  it('produces different keys on each call', async () => {
    const pairA = await generateKeyPair()
    const pairB = await generateKeyPair()
    const pubA = await exportPublicKey(pairA.publicKey)
    const pubB = await exportPublicKey(pairB.publicKey)
    expect(pubA).not.toBe(pubB)
  })
})

describe('exportPublicKey / importPublicKey roundtrip', () => {
  it('reimports an exported public key as a CryptoKey with ECDH algorithm', async () => {
    const pair = await generateKeyPair()
    const exported = await exportPublicKey(pair.publicKey)
    expect(typeof exported).toBe('string')
    expect(exported.length).toBeGreaterThan(0)

    const reimported = await importPublicKey(exported)
    expect(reimported).toBeInstanceOf(CryptoKey)
    expect(reimported.algorithm.name).toBe('ECDH')
  })

  it('roundtripped key produces the same base64 string when exported again', async () => {
    const pair = await generateKeyPair()
    const exported = await exportPublicKey(pair.publicKey)
    const reimported = await importPublicKey(exported)
    const reexported = await exportPublicKey(reimported)
    expect(reexported).toBe(exported)
  })
})

describe('exportPrivateKey / importPrivateKey roundtrip', () => {
  it('reimported private key has deriveKey usage and is not extractable', async () => {
    const pair = await generateKeyPair()
    const exported = await exportPrivateKey(pair.privateKey)
    expect(typeof exported).toBe('string')
    expect(exported.length).toBeGreaterThan(0)

    const reimported = await importPrivateKey(exported)
    expect(reimported).toBeInstanceOf(CryptoKey)
    expect(reimported.usages).toContain('deriveKey')
    expect(reimported.extractable).toBe(false)
  })

  it('reimported private key has ECDH algorithm', async () => {
    const pair = await generateKeyPair()
    const exported = await exportPrivateKey(pair.privateKey)
    const reimported = await importPrivateKey(exported)
    expect(reimported.algorithm.name).toBe('ECDH')
  })
})

describe('deriveSharedKey', () => {
  it('Alice and Bob independently derive the same shared key (verified by encrypt/decrypt roundtrip)', async () => {
    const alicePair = await generateKeyPair()
    const bobPair = await generateKeyPair()

    const aliceShared = await deriveSharedKey(alicePair.privateKey, bobPair.publicKey)
    const bobShared = await deriveSharedKey(bobPair.privateKey, alicePair.publicKey)

    const plaintext = 'shared secret message'
    const { ciphertext, iv } = await encryptMessage(aliceShared, plaintext)
    const decrypted = await decryptMessage(bobShared, ciphertext, iv)
    expect(decrypted).toBe(plaintext)
  })

  it('returns a non-extractable AES-GCM CryptoKey', async () => {
    const alicePair = await generateKeyPair()
    const bobPair = await generateKeyPair()
    const sharedKey = await deriveSharedKey(alicePair.privateKey, bobPair.publicKey)
    expect(sharedKey).toBeInstanceOf(CryptoKey)
    expect(sharedKey.algorithm.name).toBe('AES-GCM')
    expect(sharedKey.extractable).toBe(false)
  })
})

describe('encryptMessage / decryptMessage', () => {
  async function makeSharedKey() {
    const alicePair = await generateKeyPair()
    const bobPair = await generateKeyPair()
    return {
      alice: await deriveSharedKey(alicePair.privateKey, bobPair.publicKey),
      bob: await deriveSharedKey(bobPair.privateKey, alicePair.publicKey),
    }
  }

  it('encrypt then decrypt returns the original plaintext', async () => {
    const { alice, bob } = await makeSharedKey()
    const { ciphertext, iv } = await encryptMessage(alice, 'hello world')
    const result = await decryptMessage(bob, ciphertext, iv)
    expect(result).toBe('hello world')
  })

  it('empty string roundtrips', async () => {
    const { alice, bob } = await makeSharedKey()
    const { ciphertext, iv } = await encryptMessage(alice, '')
    const result = await decryptMessage(bob, ciphertext, iv)
    expect(result).toBe('')
  })

  it('unicode string roundtrips', async () => {
    const { alice, bob } = await makeSharedKey()
    const plaintext = 'Hello 世界'
    const { ciphertext, iv } = await encryptMessage(alice, plaintext)
    const result = await decryptMessage(bob, ciphertext, iv)
    expect(result).toBe(plaintext)
  })

  it('each encrypt call produces a different IV (random nonce)', async () => {
    const { alice } = await makeSharedKey()
    const { iv: iv1 } = await encryptMessage(alice, 'test')
    const { iv: iv2 } = await encryptMessage(alice, 'test')
    expect(iv1).not.toBe(iv2)
  })

  it('tampered ciphertext throws on decrypt', async () => {
    const { alice, bob } = await makeSharedKey()
    const { iv } = await encryptMessage(alice, 'tamper me')
    const tamperedCiphertext = 'aGVsbG8gd29ybGQ='  // unrelated base64
    await expect(decryptMessage(bob, tamperedCiphertext, iv)).rejects.toThrow()
  })

  it('null/invalid IV throws on decrypt', async () => {
    const { alice, bob } = await makeSharedKey()
    const { ciphertext } = await encryptMessage(alice, 'test')
    await expect(decryptMessage(bob, ciphertext, '')).rejects.toThrow()
  })
})

describe('cross-module roundtrip', () => {
  it('full flow: generate keys, derive shared keys both sides, encrypt, decrypt', async () => {
    const alicePair = await generateKeyPair()
    const bobPair = await generateKeyPair()

    // Export and reimport to simulate persisted/transmitted keys
    const alicePubExported = await exportPublicKey(alicePair.publicKey)
    const alicePrivExported = await exportPrivateKey(alicePair.privateKey)
    const bobPubExported = await exportPublicKey(bobPair.publicKey)
    const bobPrivExported = await exportPrivateKey(bobPair.privateKey)

    const alicePubImported = await importPublicKey(alicePubExported)
    const alicePrivImported = await importPrivateKey(alicePrivExported)
    const bobPubImported = await importPublicKey(bobPubExported)
    const bobPrivImported = await importPrivateKey(bobPrivExported)

    const aliceShared = await deriveSharedKey(alicePrivImported, bobPubImported)
    const bobShared = await deriveSharedKey(bobPrivImported, alicePubImported)

    const plaintext = 'End-to-end encrypted message!'
    const { ciphertext, iv } = await encryptMessage(aliceShared, plaintext)
    const decrypted = await decryptMessage(bobShared, ciphertext, iv)

    expect(decrypted).toBe(plaintext)
  })
})
