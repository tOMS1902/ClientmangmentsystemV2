// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validatePhotoFile,
  buildStoragePath,
  uploadPhotoToStorage,
  getSignedPhotoUrl,
} from '@/lib/supabase/photoStorage'

// ─── helpers ──────────────────────────────────────────────────────────────

function makeFile(type: string, sizeBytes: number): File {
  // Build a blob of the requested size then wrap it in a File
  const blob = new Blob([new Uint8Array(sizeBytes)], { type })
  return new File([blob], 'test-photo.jpg', { type })
}

const MB = 1024 * 1024

// ─── validatePhotoFile ─────────────────────────────────────────────────────

describe('validatePhotoFile', () => {
  it('returns null (valid) for a jpeg file under 10 MB', () => {
    const file = makeFile('image/jpeg', 1 * MB)
    expect(validatePhotoFile(file)).toBeNull()
  })

  it('returns null (valid) for a png file', () => {
    const file = makeFile('image/png', 2 * MB)
    expect(validatePhotoFile(file)).toBeNull()
  })

  it('returns null (valid) for a webp file', () => {
    const file = makeFile('image/webp', 3 * MB)
    expect(validatePhotoFile(file)).toBeNull()
  })

  it('returns an error string for an invalid file type (pdf)', () => {
    const file = makeFile('application/pdf', 1 * MB)
    const result = validatePhotoFile(file)
    expect(typeof result).toBe('string')
    expect(result!.length).toBeGreaterThan(0)
  })

  it('returns an error string for an invalid file type (gif)', () => {
    const file = makeFile('image/gif', 1 * MB)
    const result = validatePhotoFile(file)
    expect(typeof result).toBe('string')
  })

  it('returns an error string for a file exceeding 10 MB', () => {
    const file = makeFile('image/jpeg', 10 * MB + 1)
    const result = validatePhotoFile(file)
    expect(typeof result).toBe('string')
    expect(result!.length).toBeGreaterThan(0)
  })

  it('returns null for a file that is exactly 10 MB (boundary)', () => {
    const file = makeFile('image/jpeg', 10 * MB)
    expect(validatePhotoFile(file)).toBeNull()
  })
})

// ─── buildStoragePath ─────────────────────────────────────────────────────

describe('buildStoragePath', () => {
  it('contains the clientId in the returned path', () => {
    const path = buildStoragePath('client-abc', 3, 'front')
    expect(path).toContain('client-abc')
  })

  it('contains the weekNumber formatted as wkN', () => {
    const path = buildStoragePath('client-abc', 3, 'front')
    expect(path).toContain('wk3')
  })

  it('contains the photoType', () => {
    const pathFront = buildStoragePath('client-abc', 1, 'front')
    const pathBack = buildStoragePath('client-abc', 1, 'back')
    expect(pathFront).toContain('front')
    expect(pathBack).toContain('back')
  })

  it('contains a timestamp (numeric characters)', () => {
    const before = Date.now()
    const path = buildStoragePath('client-abc', 1, 'front')
    const after = Date.now()
    // Extract timestamp from path — it is the numeric suffix before .jpg
    const match = path.match(/(\d{10,})/)
    expect(match).not.toBeNull()
    const ts = parseInt(match![1], 10)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('returns different paths on consecutive calls (unique timestamps)', async () => {
    // Brief delay so Date.now() advances
    const path1 = buildStoragePath('client-abc', 1, 'front')
    await new Promise(r => setTimeout(r, 2))
    const path2 = buildStoragePath('client-abc', 1, 'front')
    expect(path1).not.toBe(path2)
  })
})

// ─── uploadPhotoToStorage ─────────────────────────────────────────────────

describe('uploadPhotoToStorage', () => {
  function makeSupabaseMock(uploadResult: { error: null | { message: string } }) {
    const uploadFn = vi.fn().mockResolvedValue(uploadResult)
    const fromFn = vi.fn().mockReturnValue({ upload: uploadFn })
    return {
      supabase: { storage: { from: fromFn } } as any,
      uploadFn,
      fromFn,
    }
  }

  it('calls supabase.storage.from() with the correct bucket name', async () => {
    const { supabase, fromFn } = makeSupabaseMock({ error: null })
    const file = makeFile('image/jpeg', 1 * MB)
    await uploadPhotoToStorage(supabase, 'client-1', 1, 'front', file)
    expect(fromFn).toHaveBeenCalledWith('progress-photos')
  })

  it('calls upload() with a path that includes the clientId and weekNumber', async () => {
    const { supabase, uploadFn } = makeSupabaseMock({ error: null })
    const file = makeFile('image/jpeg', 1 * MB)
    await uploadPhotoToStorage(supabase, 'client-1', 2, 'back', file)
    const [pathArg] = uploadFn.mock.calls[0]
    expect(pathArg).toContain('client-1')
    expect(pathArg).toContain('wk2')
    expect(pathArg).toContain('back')
  })

  it('calls upload() with the file as the second argument', async () => {
    const { supabase, uploadFn } = makeSupabaseMock({ error: null })
    const file = makeFile('image/jpeg', 1 * MB)
    await uploadPhotoToStorage(supabase, 'client-1', 1, 'front', file)
    expect(uploadFn.mock.calls[0][1]).toBe(file)
  })

  it('returns a non-empty path and null error on success', async () => {
    const { supabase } = makeSupabaseMock({ error: null })
    const file = makeFile('image/jpeg', 1 * MB)
    const result = await uploadPhotoToStorage(supabase, 'client-1', 1, 'front', file)
    expect(result.error).toBeNull()
    expect(result.path.length).toBeGreaterThan(0)
  })

  it('returns empty path and error string on upload failure', async () => {
    const { supabase } = makeSupabaseMock({ error: { message: 'Storage quota exceeded' } })
    const file = makeFile('image/jpeg', 1 * MB)
    const result = await uploadPhotoToStorage(supabase, 'client-1', 1, 'front', file)
    expect(result.path).toBe('')
    expect(result.error).toBe('Storage quota exceeded')
  })
})

// ─── getSignedPhotoUrl ─────────────────────────────────────────────────────

describe('getSignedPhotoUrl', () => {
  function makeSupabaseMock(result: { data: { signedUrl: string } | null; error: null | object }) {
    const createSignedUrlFn = vi.fn().mockResolvedValue(result)
    const fromFn = vi.fn().mockReturnValue({ createSignedUrl: createSignedUrlFn })
    return {
      supabase: { storage: { from: fromFn } } as any,
      createSignedUrlFn,
      fromFn,
    }
  }

  it('calls createSignedUrl with expiry of 3600 seconds', async () => {
    const { supabase, createSignedUrlFn } = makeSupabaseMock({
      data: { signedUrl: 'https://cdn.example.com/photo.jpg' },
      error: null,
    })
    await getSignedPhotoUrl(supabase, 'client-1/wk1_front_123.jpg')
    expect(createSignedUrlFn).toHaveBeenCalledWith('client-1/wk1_front_123.jpg', 3600)
  })

  it('returns the signedUrl string on success', async () => {
    const expectedUrl = 'https://cdn.example.com/photo.jpg'
    const { supabase } = makeSupabaseMock({ data: { signedUrl: expectedUrl }, error: null })
    const result = await getSignedPhotoUrl(supabase, 'some/path.jpg')
    expect(result).toBe(expectedUrl)
  })

  it('returns null when supabase returns an error', async () => {
    const { supabase } = makeSupabaseMock({ data: null, error: { message: 'Not found' } })
    const result = await getSignedPhotoUrl(supabase, 'some/path.jpg')
    expect(result).toBeNull()
  })

  it('returns null when data is null even without an error', async () => {
    const { supabase } = makeSupabaseMock({ data: null, error: null })
    const result = await getSignedPhotoUrl(supabase, 'some/path.jpg')
    expect(result).toBeNull()
  })
})
