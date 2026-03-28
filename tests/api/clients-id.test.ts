// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/clients/[id]/route'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = vi.mocked(createServerSupabaseClient)

// For GET: profiles → clients (select)
function makeGetSupabase({
  user = null as { id: string } | null,
  profileRole = null as string | null,
  clientData = null as object | null,
  clientError = null as { message: string } | null,
} = {}) {
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profileRole ? { role: profileRole } : null, error: null }),
  }

  const clientChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: clientData, error: clientError }),
  }

  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain
      return clientChain
    }),
  }

  return supabase as any
}

// For PATCH: profiles → clients (update + eq + select + single)
function makePatchSupabase({
  user = null as { id: string } | null,
  profileRole = null as string | null,
  updateData = null as object | null,
  updateError = null as { message: string } | null,
} = {}) {
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profileRole ? { role: profileRole } : null, error: null }),
  }

  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: updateData, error: updateError }),
  }

  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain
      return updateChain
    }),
  }

  return supabase as any
}

const params = Promise.resolve({ id: 'client-001' })

describe('GET /api/clients/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeGetSupabase({ user: null }))
    const res = await GET(new Request('http://localhost/api/clients/client-001'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 401 when profile has no role', async () => {
    mockCreateClient.mockResolvedValue(makeGetSupabase({ user: { id: 'u1' }, profileRole: null }))
    const res = await GET(new Request('http://localhost/api/clients/client-001'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when client not found', async () => {
    mockCreateClient.mockResolvedValue(makeGetSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientData: null,
      clientError: { message: 'Not found' },
    }))
    const res = await GET(new Request('http://localhost/api/clients/client-001'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 200 with client data for coach', async () => {
    const client = { id: 'client-001', full_name: 'Test Client' }
    mockCreateClient.mockResolvedValue(makeGetSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientData: client,
    }))
    const res = await GET(new Request('http://localhost/api/clients/client-001'), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.full_name).toBe('Test Client')
  })

  it('returns 200 with client data for client role (own record)', async () => {
    const client = { id: 'client-001', full_name: 'Me' }
    mockCreateClient.mockResolvedValue(makeGetSupabase({
      user: { id: 'u1' },
      profileRole: 'client',
      clientData: client,
    }))
    const res = await GET(new Request('http://localhost/api/clients/client-001'), { params })
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/clients/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makePatchSupabase({ user: null }))
    const res = await PATCH(
      new Request('http://localhost/api/clients/client-001', {
        method: 'PATCH',
        body: JSON.stringify({ current_weight: 85 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params }
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a coach', async () => {
    mockCreateClient.mockResolvedValue(makePatchSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const res = await PATCH(
      new Request('http://localhost/api/clients/client-001', {
        method: 'PATCH',
        body: JSON.stringify({ current_weight: 85 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params }
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when check_in_day is invalid enum value', async () => {
    mockCreateClient.mockResolvedValue(makePatchSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const res = await PATCH(
      new Request('http://localhost/api/clients/client-001', {
        method: 'PATCH',
        body: JSON.stringify({ check_in_day: 'Funday' }), // invalid enum
        headers: { 'Content-Type': 'application/json' },
      }),
      { params }
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 with updated client on success', async () => {
    const updated = { id: 'client-001', current_weight: 85 }
    mockCreateClient.mockResolvedValue(makePatchSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      updateData: updated,
    }))
    const res = await PATCH(
      new Request('http://localhost/api/clients/client-001', {
        method: 'PATCH',
        body: JSON.stringify({ current_weight: 85 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.current_weight).toBe(85)
  })

  it('accepts valid check_in_day enum values', async () => {
    const updated = { id: 'client-001', check_in_day: 'Monday' }
    mockCreateClient.mockResolvedValue(makePatchSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      updateData: updated,
    }))
    const res = await PATCH(
      new Request('http://localhost/api/clients/client-001', {
        method: 'PATCH',
        body: JSON.stringify({ check_in_day: 'Monday' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params }
    )
    expect(res.status).toBe(200)
  })
})
