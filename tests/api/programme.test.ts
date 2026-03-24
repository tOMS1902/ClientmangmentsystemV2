// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/programme/route'

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
  programmeResult = null as object | null,
  programmeError = null as { message: string } | null,
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

  const deactivateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }

  const programmeInsertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: programmeResult, error: programmeError }),
  }

  const dayInsertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'day-1' }, error: null }),
  }

  const exerciseInsertChain = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  }

  const programmeCallCount = { n: 0 }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain
      if (table === 'clients') return clientChain
      if (table === 'programmes') {
        programmeCallCount.n++
        // First call: deactivate existing (update), second call: insert new
        return programmeCallCount.n === 1 ? deactivateChain : programmeInsertChain
      }
      if (table === 'programme_days') return dayInsertChain
      if (table === 'exercises') return exerciseInsertChain
      return programmeInsertChain
    }),
  }

  return supabase as any
}

const validBody = {
  clientId: CLIENT_UUID,
  name: 'Strength Phase 1',
  days: [
    {
      day_label: 'Monday',
      exercises: [
        { name: 'Squat', sets: 4, reps: '6-8', rest_seconds: 120 },
        { name: 'Bench Press', sets: 4, reps: '6-8' },
      ],
    },
    {
      day_label: 'Wednesday',
      exercises: [
        { name: 'Deadlift', sets: 3, reps: '5' },
      ],
    },
  ],
}

describe('POST /api/programme', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: null }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a coach', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'client' }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when clientId is not a valid UUID', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, clientId: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when days array is empty', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify({ clientId: CLIENT_UUID, name: 'Phase 1', days: [] }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ user: { id: 'u1' }, profileRole: 'coach' }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify({ clientId: CLIENT_UUID, days: validBody.days }),
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
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 201 on successful programme creation', async () => {
    const programme = { id: 'prog-1', name: 'Strength Phase 1', client_id: CLIENT_UUID, is_active: true }
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientRecord: { id: CLIENT_UUID },
      programmeResult: programme,
    }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Strength Phase 1')
    expect(body.is_active).toBe(true)
  })

  it('returns 201 for a day with no exercises', async () => {
    const programme = { id: 'prog-2', name: 'Rest Week', client_id: CLIENT_UUID, is_active: true }
    mockCreateClient.mockResolvedValue(makeSupabase({
      user: { id: 'u1' },
      profileRole: 'coach',
      clientRecord: { id: CLIENT_UUID },
      programmeResult: programme,
    }))
    const req = new Request('http://localhost/api/programme', {
      method: 'POST',
      body: JSON.stringify({
        clientId: CLIENT_UUID,
        name: 'Rest Week',
        days: [{ day_label: 'Monday', exercises: [] }],
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
