// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, DELETE } from '@/app/api/habits/route'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = vi.mocked(createServerSupabaseClient)

const CLIENT_UUID = '00000000-0000-4000-8000-000000000001'

function makeSupabase({
  user = null as { id: string } | null,
  profileRole = null as string | null,
  clientRecord = null as object | null,
  habitResult = null as object | null,
  habitError = null as { message: string } | null,
  deleteError = null as { message: string } | null,
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

  const insertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: habitResult, error: habitError }),
  }

  const deleteChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: deleteError }),
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain
      if (table === 'clients') return clientChain
      // habits table: support both insert (POST) and update (DELETE)
      return { ...insertChain, ...deleteChain }
    }),
  }

  return supabase as any
}

const validBody = {
  client_id: CLIENT_UUID,
  name: 'Drink 2L water',
}

describe('POST /api/habits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/habits', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a coach', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const req = new Request('http://localhost/api/habits', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when name is missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/habits', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT_UUID }), // missing name
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when client_id is not a valid UUID', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/habits', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'not-a-uuid', name: 'Exercise' }),
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
    const req = new Request('http://localhost/api/habits', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 201 on successful habit creation', async () => {
    const habit = { id: 'habit-1', ...validBody }
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientRecord: { id: CLIENT_UUID },
      habitResult: habit,
    }))
    const req = new Request('http://localhost/api/habits', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Drink 2L water')
  })
})

describe('DELETE /api/habits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/habits?id=habit-1', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a coach', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const req = new Request('http://localhost/api/habits?id=habit-1', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when habit id is missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/habits', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 on successful soft-delete', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      deleteError: null,
    }))
    const req = new Request('http://localhost/api/habits?id=habit-1', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
