// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/messages/[clientId]/route'

// ─── Supabase mock factory ─────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createServerSupabaseClient)

/**
 * Build a minimal chainable Supabase mock.
 *
 * Each builder method (from, select, eq, order, limit, lt, insert, single)
 * returns `this` so the chain resolves to the terminal promise set on
 * `_queryResult`.
 */
function makeSupabase({
  user = null as { id: string } | null,
  authError = null as Error | null,
  profileRole = null as string | null,
  clientRecord = null as { id: string } | null,
  messages = [] as object[],
  messagesError = null as { message: string } | null,
  insertedMessage = null as object | null,
  insertError = null as { message: string } | null,
} = {}) {
  // Shared query result reference — tests override per call via the chain
  const terminal = {
    data: null as any,
    error: null as any,
  }

  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

  // Track call sequence on `from` to route different results
  let fromCallIndex = 0
  const fromCalls: Array<{ table: string; result: any }> = []

  // profiles query
  fromCalls.push({
    table: 'profiles',
    result: { data: profileRole ? { role: profileRole } : null, error: null },
  })
  // clients query (access check)
  fromCalls.push({
    table: 'clients',
    result: { data: clientRecord, error: clientRecord ? null : { message: 'Not found' } },
  })
  // messages query (GET) or insert (POST)
  fromCalls.push({
    table: 'messages',
    result: messagesError
      ? { data: null, error: messagesError }
      : insertedMessage !== null
      ? { data: insertedMessage, error: insertError }
      : { data: messages, error: null },
  })

  chain.single.mockImplementation(() => {
    const call = fromCalls[fromCallIndex - 1]
    return Promise.resolve(call ? call.result : { data: null, error: null })
  })

  // Override: make the chain itself thenable for non-single queries
  chain.then = (resolve: (v: any) => any) => {
    const call = fromCalls[fromCallIndex - 1]
    return Promise.resolve(call ? call.result : { data: null, error: null }).then(resolve)
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation((_table: string) => {
      fromCallIndex++
      return chain
    }),
  }

  return supabase as any
}

// ─── Params helper ─────────────────────────────────────────────────────────

const TARGET_CLIENT_ID = 'aaaabbbb-1111-2222-3333-444455556666'

function makeParams(clientId = TARGET_CLIENT_ID) {
  return { params: Promise.resolve({ clientId }) }
}

// ─── GET /api/messages/[clientId] ─────────────────────────────────────────

describe('GET /api/messages/[clientId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when there is no authenticated user', async () => {
    const supabase = makeSupabase({ user: null })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 403 when a client requests a different client thread', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-client-1' },
      profileRole: 'client',
      // clientRecord id does NOT match TARGET_CLIENT_ID
      clientRecord: { id: 'completely-different-id' },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(403)
  })

  it('returns 200 with a messages array when access is granted as client', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-client-1' },
      profileRole: 'client',
      clientRecord: { id: TARGET_CLIENT_ID },
      messages: [{ id: 'msg-1', body: 'hello', created_at: '2024-01-01T00:00:00Z' }],
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.messages)).toBe(true)
  })

  it('returns 403 when a coach requests a client not in their roster', async () => {
    const supabase = makeSupabase({
      user: { id: 'coach-user-id' },
      profileRole: 'coach',
      clientRecord: null, // not their client
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`)
    const res = await GET(req, makeParams())

    expect(res.status).toBe(403)
  })
})

// ─── POST /api/messages/[clientId] ────────────────────────────────────────

describe('POST /api/messages/[clientId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function authorizedClientSupabase() {
    return makeSupabase({
      user: { id: 'user-client-1' },
      profileRole: 'client',
      clientRecord: { id: TARGET_CLIENT_ID },
      insertedMessage: { id: 'new-msg', body: 'aGVsbG8=', iv: 'aXY=', client_id: TARGET_CLIENT_ID },
    })
  }

  it('returns 401 when unauthenticated', async () => {
    const supabase = makeSupabase({ user: null })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ body: 'aGVsbG8=', iv: 'aXY=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(401)
  })

  it('returns 400 when the request body is missing entirely', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    // body field is absent from JSON payload
    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ iv: 'aXY=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('returns 400 when body is an empty string', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ body: '   ', iv: 'aXY=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('returns 400 when body.length > 8000', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const longBody = 'a'.repeat(8001)
    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ body: longBody, iv: 'aXY=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
  })

  it('accepts body exactly at the 8000 character boundary', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-client-1' },
      profileRole: 'client',
      clientRecord: { id: TARGET_CLIENT_ID },
      insertedMessage: { id: 'new-msg', body: 'a'.repeat(8000), iv: 'aXY=', client_id: TARGET_CLIENT_ID },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ body: 'a'.repeat(8000), iv: 'aXY=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    // Should not be 400 for body-length reason
    expect(res.status).not.toBe(400)
  })

  it('returns 400 when iv is missing', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ body: 'aGVsbG8=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(400)
    const resBody = await res.json()
    expect(resBody.error).toMatch(/iv/i)
  })

  it('returns 201 with the inserted message when request is valid', async () => {
    const supabase = authorizedClientSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request(`http://localhost/api/messages/${TARGET_CLIENT_ID}`, {
      method: 'POST',
      body: JSON.stringify({ body: 'aGVsbG8=', iv: 'aXY=' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, makeParams())

    expect(res.status).toBe(201)
    const resBody = await res.json()
    expect(resBody).toHaveProperty('id')
  })
})
