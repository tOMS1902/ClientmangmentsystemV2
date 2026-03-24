// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { storeKeyPair, loadPrivateKey, loadPublicKey } from '@/lib/keystore'

beforeEach(() => {
  localStorage.clear()
})

describe('loadPrivateKey', () => {
  it('returns null before any key is stored', () => {
    const result = loadPrivateKey('user-a')
    expect(result).toBeNull()
  })

  it('returns null for an unknown userId', () => {
    storeKeyPair('user-a', 'privA', 'pubA')
    const result = loadPrivateKey('user-unknown')
    expect(result).toBeNull()
  })
})

describe('loadPublicKey', () => {
  it('returns null before any key is stored', () => {
    const result = loadPublicKey('user-a')
    expect(result).toBeNull()
  })

  it('returns null for an unknown userId', () => {
    storeKeyPair('user-a', 'privA', 'pubA')
    const result = loadPublicKey('user-unknown')
    expect(result).toBeNull()
  })
})

describe('storeKeyPair / loadPrivateKey / loadPublicKey roundtrip', () => {
  it('after storing, loadPrivateKey returns the stored private key', () => {
    storeKeyPair('user-1', 'base64-private-key', 'base64-public-key')
    const priv = loadPrivateKey('user-1')
    expect(priv).toBe('base64-private-key')
  })

  it('after storing, loadPublicKey returns the stored public key', () => {
    storeKeyPair('user-1', 'base64-private-key', 'base64-public-key')
    const pub = loadPublicKey('user-1')
    expect(pub).toBe('base64-public-key')
  })

  it('roundtrips arbitrary base64 strings faithfully', () => {
    const privKey = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg=='
    const pubKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE=='
    storeKeyPair('user-roundtrip', privKey, pubKey)
    expect(loadPrivateKey('user-roundtrip')).toBe(privKey)
    expect(loadPublicKey('user-roundtrip')).toBe(pubKey)
  })
})

describe('namespace isolation', () => {
  it('keys stored for userId A do not affect userId B', () => {
    storeKeyPair('user-a', 'privA', 'pubA')
    expect(loadPrivateKey('user-b')).toBeNull()
    expect(loadPublicKey('user-b')).toBeNull()
  })

  it('each userId has its own private key', () => {
    storeKeyPair('user-a', 'privA', 'pubA')
    storeKeyPair('user-b', 'privB', 'pubB')
    expect(loadPrivateKey('user-a')).toBe('privA')
    expect(loadPrivateKey('user-b')).toBe('privB')
  })

  it('each userId has its own public key', () => {
    storeKeyPair('user-a', 'privA', 'pubA')
    storeKeyPair('user-b', 'privB', 'pubB')
    expect(loadPublicKey('user-a')).toBe('pubA')
    expect(loadPublicKey('user-b')).toBe('pubB')
  })
})

describe('overwrite', () => {
  it('calling storeKeyPair twice overwrites the previous private key', () => {
    storeKeyPair('user-x', 'oldPriv', 'oldPub')
    storeKeyPair('user-x', 'newPriv', 'newPub')
    expect(loadPrivateKey('user-x')).toBe('newPriv')
  })

  it('calling storeKeyPair twice overwrites the previous public key', () => {
    storeKeyPair('user-x', 'oldPriv', 'oldPub')
    storeKeyPair('user-x', 'newPriv', 'newPub')
    expect(loadPublicKey('user-x')).toBe('newPub')
  })

  it('overwrite does not affect other userIds', () => {
    storeKeyPair('user-a', 'privA', 'pubA')
    storeKeyPair('user-b', 'privB-old', 'pubB-old')
    storeKeyPair('user-b', 'privB-new', 'pubB-new')
    expect(loadPrivateKey('user-a')).toBe('privA')
    expect(loadPublicKey('user-a')).toBe('pubA')
  })
})
