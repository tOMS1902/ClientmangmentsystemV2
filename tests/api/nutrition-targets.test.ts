// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/nutrition-targets/route'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = vi.mocked(createServerSupabaseClient)

const CLIENT_UUID = '00000000-0000-4000-8000-000000000001'

function makeChain(result: { data: any; error: any }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
}

function makeSupabase({
  user = null as { id: string } | null,
  profileRole = null as string | null,
  clientRecord = null as object | null,
  upsertResult = null as object | null,
  upsertError = null as { message: string } | null,
  getResult = null as object | null,
  getError = null as { message: string } | null,
} = {}) {
  const profileChain = makeChain({ data: profileRole ? { role: profileRole } : null, error: null })

  const clientChain = makeChain({
    data: clientRecord,
    error: clientRecord ? null : { message: 'Not found' },
  })

  const upsertChain = makeChain({
    data: upsertResult,
    error: upsertError,
  })

  const getChain = makeChain({
    data: getResult,
    error: getError,
  })

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain
      if (table === 'clients') return clientChain
      // POST uses upsertChain, GET uses getChain — pick by which result is configured
      if (table === 'nutrition_targets') return upsertResult !== null ? upsertChain : getChain
      return upsertChain
    }),
  }

  return supabase as any
}

const validBody = {
  client_id: CLIENT_UUID,
  td_calories: 2500,
  td_protein: 180,
  td_carbs: 280,
  td_fat: 70,
  ntd_calories: 2000,
  ntd_protein: 160,
  ntd_carbs: 200,
  ntd_fat: 65,
  daily_steps: 8000,
  sleep_target_hours: 7.5,
}

describe('POST /api/nutrition-targets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/nutrition-targets', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a coach', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const req = new Request('http://localhost/api/nutrition-targets', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when validation fails (missing required fields)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/nutrition-targets', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT_UUID }), // missing all macro fields
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when client_id is not a valid UUID', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/nutrition-targets', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, client_id: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when coach does not own the client', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientRecord: null,
    }))
    const req = new Request('http://localhost/api/nutrition-targets', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 on successful upsert', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientRecord: { id: CLIENT_UUID },
      upsertResult: { id: 'target-1', ...validBody },
    }))
    const req = new Request('http://localhost/api/nutrition-targets', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client_id).toBe(CLIENT_UUID)
  })
})

describe('GET /api/nutrition-targets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/nutrition-targets?clientId=c1')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when clientId is missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' } }))
    const req = new Request('http://localhost/api/nutrition-targets')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns null when no targets exist', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      getResult: null,
      getError: { message: 'Not found' },
    }))
    const req = new Request('http://localhost/api/nutrition-targets?clientId=c1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns targets when they exist', async () => {
    const targets = { id: 't1', client_id: CLIENT_UUID, td_calories: 2500 }
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      getResult: targets,
      getError: null,
    }))
    const req = new Request(`http://localhost/api/nutrition-targets?clientId=${CLIENT_UUID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.td_calories).toBe(2500)
  })
})
