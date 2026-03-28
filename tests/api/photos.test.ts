// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/photos/[clientId]/route'

// ─── Supabase mock ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createServerSupabaseClient)

const TARGET_CLIENT_ID = 'client-uuid-1234-5678-0000-aabbccddeeff'

/**
 * Builds a Supabase mock for the photos route.
 *
 * `from` call sequence for GET:
 *   1. profiles
 *   2. clients (access check)
 *   3. check_in_photos (fetch)
 *
 * `from` call sequence for POST:
 *   1. profiles
 *   2. clients (access check)
 *   3. check_in_photos (insert)
 */
function makeSupabase({
  user = null as { id: string } | null,
  authError = null as Error | null,
  profileRole = null as string | null,
  clientAccessRecord = null as { id: string } | null,
  photos = [] as object[],
  photosError = null as { message: string } | null,
  insertedPhoto = null as object | null,
  insertError = null as { message: string } | null,
  signedUrl = 'https://cdn.example.com/photo.jpg',
  signedUrlError = null as object | null,
} = {}) {
  let fromCallIndex = 0

  // Signed URL mock for storage
  const createSignedUrlMock = vi.fn().mockResolvedValue(
    signedUrlError
      ? { data: null, error: signedUrlError }
      : { data: { signedUrl }, error: null }
  )

  const storageChain = {
    createSignedUrl: createSignedUrlMock,
    remove: vi.fn().mockResolvedValue({ error: null }),
  }

  const resultsPerFromCall: Array<{ data: any; error: any }> = [
    // 1. profiles
    { data: profileRole ? { role: profileRole } : null, error: null },
    // 2. clients access check
    clientAccessRecord === null
      ? { data: null, error: { message: 'Not found' } }
      : { data: clientAccessRecord, error: null },
    // 3. check_in_photos fetch or insert
    photosError
      ? { data: null, error: photosError }
      : insertError
      ? { data: null, error: insertError }
      : insertedPhoto !== null
      ? { data: insertedPhoto, error: null }
      : { data: photos, error: null },
  ]

  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const result = resultsPerFromCall[fromCallIndex - 1] ?? { data: null, error: null }
      return Promise.resolve(result)
    }),
    // Thenable for non-.single() termination (used in photos fetch — no .single())
    then: (resolve: (v: any) => any) => {
      const result = resultsPerFromCall[fromCallIndex - 1] ?? { data: null, error: null }
      return Promise.resolve(result).then(resolve)
    },
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from: vi.fn().mockImplementation(() => {
      fromCallIndex++
      return chain
    }),
    storage: {
      from: vi.fn().mockReturnValue(storageChain),
    },
  }

  return supabase as any
}

function makeParams(clientId = TARGET_CLIENT_ID) {
  return { params: Promise.resolve({ clientId }) }
}

// ─── GET /api/photos/[clientId] ───────────────────────────────────────────

describe('GET /api/photos/[clientId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supabase = makeSupabase({ user: null })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(401)
  })

  it('returns 403 when a client accesses another client\'s photos', async () => {
    const supabase = makeSupabase({
      user: { id: 'different-client-user' },
      profileRole: 'client',
      // clientAccessRecord null means the eq('id', clientId).eq('user_id', ...) match failed
      clientAccessRecord: null,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(403)
  })

  it('returns 200 with a photos array including signed_urls on success', async () => {
    const photo = {
      id: 'photo-1',
      client_id: TARGET_CLIENT_ID,
      storage_path: `${TARGET_CLIENT_ID}/wk1_front_123.jpg`,
      week_number: 1,
      photo_type: 'front',
    }
    const supabase = makeSupabase({
      user: { id: 'client-user' },
      profileRole: 'client',
      clientAccessRecord: { id: TARGET_CLIENT_ID },
      photos: [photo],
      signedUrl: 'https://cdn.example.com/photo.jpg',
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('photos')
    expect(Array.isArray(body.photos)).toBe(true)
  })

  it('returns 200 with signed_url set to a string for each photo', async () => {
    const photo = {
      id: 'photo-1',
      storage_path: `${TARGET_CLIENT_ID}/wk1_front_123.jpg`,
    }
    const expectedSignedUrl = 'https://cdn.example.com/photo.jpg'
    const supabase = makeSupabase({
      user: { id: 'coach-user' },
      profileRole: 'coach',
      clientAccessRecord: { id: TARGET_CLIENT_ID },
      photos: [photo],
      signedUrl: expectedSignedUrl,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.photos[0].signed_url).toBe(expectedSignedUrl)
  })

  it('returns 403 when coach requests a client not in their roster', async () => {
    const supabase = makeSupabase({
      user: { id: 'coach-user' },
      profileRole: 'coach',
      clientAccessRecord: null,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(403)
  })
})

// ─── POST /api/photos/[clientId] ──────────────────────────────────────────

describe('POST /api/photos/[clientId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function authorizedClientSupabase(overrides = {}) {
    return makeSupabase({
      user: { id: 'client-user' },
      profileRole: 'client',
      clientAccessRecord: { id: TARGET_CLIENT_ID },
      insertedPhoto: { id: 'new-photo-id', client_id: TARGET_CLIENT_ID },
      ...overrides,
    })
  }

  const validPostBody = {
    week_number: 3,
    photo_type: 'front',
    storage_path: `${TARGET_CLIENT_ID}/wk3_front_123.jpg`,
  }

  it('returns 401 when unauthenticated', async () => {
    const supabase = makeSupabase({ user: null })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify(validPostBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(401)
  })

  it('returns 400 when week_number is missing', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const { week_number: _removed, ...body } = validPostBody
    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('returns 400 when week_number is not a positive integer', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, week_number: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('returns 400 when photo_type is invalid (not front or back)', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, photo_type: 'side' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
    const resBody = await res.json()
    expect(resBody.error).toMatch(/photo_type/i)
  })

  it('returns 400 when storage_path is missing', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const { storage_path: _removed, ...body } = validPostBody
    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('returns 400 when storage_path is an empty string', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, storage_path: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('returns 201 with inserted photo on a valid request', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify(validPostBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
  })

  it('accepts photo_type "back" as a valid value', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/photos/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, photo_type: 'back' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(201)
  })
})
