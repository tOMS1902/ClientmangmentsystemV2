// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/logs/route'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = vi.mocked(createServerSupabaseClient)

function makeSupabase({
  user = null as { id: string } | null,
  profileRole = null as string | null,
  clientRecord = null as { id: string } | null,
  logResult = null as object | null,
  logError = null as { message: string } | null,
} = {}) {
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profileRole ? { role: profileRole } : null, error: null }),
  }

  const clientChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: clientRecord,
      error: clientRecord ? null : { message: 'Not found' },
    }),
  }

  const upsertChain = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: logResult, error: logError }),
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain
      if (table === 'clients') return clientChain
      return upsertChain
    }),
  }

  return supabase as any
}

const today = new Date().toISOString().split('T')[0]

// Minimal valid body — all fields except log_date are optional
const validBody = {
  log_date: today,
  calories: 2000,
  protein: 150,
  steps: 8000,
}

describe('POST /api/logs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a client', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when log_date has invalid format', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify({ log_date: 'not-a-date', calories: 2000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when log_date is in the future', async () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, log_date: future }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when no client record exists', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'client',
      clientRecord: null,
    }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 201 on successful log creation', async () => {
    const log = { id: 'log-1', ...validBody, client_id: 'client-001' }
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'client',
      clientRecord: { id: 'client-001' },
      logResult: log,
    }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.calories).toBe(2000)
  })

  it('accepts logs for today (not rejected as future)', async () => {
    const log = { id: 'log-today', ...validBody, client_id: 'client-001' }
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'client',
      clientRecord: { id: 'client-001' },
      logResult: log,
    }))
    const req = new Request('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).not.toBe(400)
  })
})
