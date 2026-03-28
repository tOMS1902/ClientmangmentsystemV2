// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/public-key/route'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = vi.mocked(createServerSupabaseClient)

function makeSupabase({
  user = null as { id: string } | null,
  updateError = null as { message: string } | null,
} = {}) {
  const chain: any = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ error: updateError }),
  }

  // Make the chain thenable (awaitable)
  Object.defineProperty(chain, Symbol.iterator, { value: undefined })

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      }),
    }),
  }

  return supabase as any
}

describe('PATCH /api/public-key', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/public-key', {
      method: 'PATCH',
      body: JSON.stringify({ publicKey: 'abc123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when publicKey is missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' } }))
    const req = new Request('http://localhost/api/public-key', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when publicKey is not a string', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' } }))
    const req = new Request('http://localhost/api/public-key', {
      method: 'PATCH',
      body: JSON.stringify({ publicKey: 42 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with { ok: true } on success', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, updateError: null }))
    const req = new Request('http://localhost/api/public-key', {
      method: 'PATCH',
      body: JSON.stringify({ publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE==' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 500 when db update fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      updateError: { message: 'DB error' },
    }))
    const req = new Request('http://localhost/api/public-key', {
      method: 'PATCH',
      body: JSON.stringify({ publicKey: 'validkey' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(500)
  })
})
