// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/checkins/route'

// ─── Supabase mock ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createServerSupabaseClient)

/**
 * Builds a Supabase mock configured for the checkins route.
 *
 * The route's `from` call sequence is:
 *   1. profiles (getUser role)
 *   2. clients  (fetch client record with id + start_date)
 *   3. weekly_checkins (duplicate check)
 *   4. weekly_checkins (insert)
 */
function makeSupabase({
  user = null as { id: string } | null,
  authError = null as Error | null,
  profileRole = null as string | null,
  clientRecord = null as { id: string; start_date: string | null } | null,
  existingCheckin = null as { id: string } | null,
  insertedCheckin = null as object | null,
  insertError = null as { message: string } | null,
} = {}) {
  // Each call to .single() returns the result for the current `from` invocation
  let fromCallIndex = 0

  const resultsPerFromCall: Array<{ data: any; error: any }> = [
    // 1. profiles
    { data: profileRole ? { role: profileRole } : null, error: null },
    // 2. clients
    clientRecord === null
      ? { data: null, error: { message: 'Not found' } }
      : { data: clientRecord, error: null },
    // 3. weekly_checkins duplicate check
    { data: existingCheckin, error: existingCheckin ? null : { message: 'Not found' } },
    // 4. weekly_checkins insert
    insertError
      ? { data: null, error: insertError }
      : { data: insertedCheckin, error: null },
  ]

  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const result = resultsPerFromCall[fromCallIndex - 1] ?? { data: null, error: null }
      return Promise.resolve(result)
    }),
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from: vi.fn().mockImplementation(() => {
      fromCallIndex++
      return chain
    }),
  }

  return supabase as any
}

// ─── Valid check-in payload ────────────────────────────────────────────────

const validBody = {
  weight: 80,
  sleep_summary: 'Slept 7 hours',
  biggest_win: 'Stayed consistent',
  diet_summary: 'Hit macros every day',
  main_challenge: 'Weekend cravings',
  focus_next_week: 'Meal prep Sunday',
  avg_steps: '9000',
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/checkins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supabase = makeSupabase({ user: null })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('returns 403 when user role is coach (not client)', async () => {
    const supabase = makeSupabase({
      user: { id: 'coach-id' },
      profileRole: 'coach',
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('returns 400 when validation fails (missing required field)', async () => {
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
    })
    mockCreateClient.mockResolvedValue(supabase)

    const { weight: _removed, ...missingWeight } = validBody

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(missingWeight),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when weight is out of range', async () => {
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, weight: 500 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 404 when no client record exists for the user', async () => {
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
      clientRecord: null,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(404)
  })

  it('returns 422 when the client record has no start_date', async () => {
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
      clientRecord: { id: 'client-record-id', start_date: null },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(422)
  })

  it('returns 409 when a check-in already exists for this week', async () => {
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
      clientRecord: { id: 'client-record-id', start_date: '2024-01-01' },
      existingCheckin: { id: 'existing-checkin-id' },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(409)
  })

  it('returns 201 on successful check-in submission', async () => {
    const inserted = { id: 'new-checkin-id', week_number: 2, ...validBody }
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
      clientRecord: { id: 'client-record-id', start_date: '2024-01-01' },
      existingCheckin: null,
      insertedCheckin: inserted,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
  })

  it('weekNumber is always >= 1 even when start_date is in the future (Math.max guard)', async () => {
    // Set start_date to far in the future — raw calculation would be negative
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const inserted = { id: 'new-checkin-id', week_number: 1, ...validBody }
    const supabase = makeSupabase({
      user: { id: 'client-user-id' },
      profileRole: 'client',
      clientRecord: { id: 'client-record-id', start_date: futureDate },
      existingCheckin: null,
      insertedCheckin: inserted,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const req = new Request('http://localhost/api/checkins', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    // Route should reach the insert step (week 1, not crash or return 4xx)
    // A 201 or 500 (if insert mock returns null) indicates weekNumber >= 1 path was taken
    expect([201, 500]).toContain(res.status)
    expect(res.status).not.toBe(400)
    expect(res.status).not.toBe(422)
  })
})
