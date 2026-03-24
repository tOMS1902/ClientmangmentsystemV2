// @vitest-environment node

import { describe, it, expect } from 'vitest'
import {
  parseBody,
  DailyLogSchema,
  CheckInSchema,
  ProgrammeSchema,
  NutritionTargetsSchema,
  AINutritionSchema,
} from '@/lib/validation'
import { z } from 'zod'

// ─── parseBody ─────────────────────────────────────────────────────────────

describe('parseBody', () => {
  const TestSchema = z.object({ name: z.string(), age: z.number().int().min(0) })

  it('returns success:true with parsed data for a valid payload', () => {
    const result = parseBody(TestSchema, { name: 'Alice', age: 30 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
      expect(result.data.age).toBe(30)
    }
  })

  it('returns success:false with an error string for an invalid payload', () => {
    const result = parseBody(TestSchema, { name: 'Bob', age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  it('does not throw for completely wrong input types', () => {
    expect(() => parseBody(TestSchema, null)).not.toThrow()
    expect(() => parseBody(TestSchema, 'not an object')).not.toThrow()
    expect(() => parseBody(TestSchema, 42)).not.toThrow()
  })

  it('returns success:false for missing required fields', () => {
    const result = parseBody(TestSchema, { name: 'Charlie' })
    expect(result.success).toBe(false)
  })
})

// ─── DailyLogSchema ────────────────────────────────────────────────────────

describe('DailyLogSchema', () => {
  const validLog = { log_date: '2024-03-15' }

  it('is valid with only log_date provided (all optional fields absent)', () => {
    const result = parseBody(DailyLogSchema, validLog)
    expect(result.success).toBe(true)
  })

  it('is valid with all fields provided', () => {
    const result = parseBody(DailyLogSchema, {
      log_date: '2024-03-15',
      calories: 2000,
      protein: 150,
      steps: 8000,
      sleep_hours: 7.5,
      hunger_score: 3,
      energy_score: 4,
      stress_score: 2,
      training_done: true,
      training_notes: 'Good session',
      notes: 'Felt great',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid log_date format (not YYYY-MM-DD)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '15/03/2024' })
    expect(result.success).toBe(false)
  })

  it('rejects log_date with letters', () => {
    const result = parseBody(DailyLogSchema, { log_date: 'yesterday' })
    expect(result.success).toBe(false)
  })

  it('rejects calories of -1 (below min of 0)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', calories: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects sleep_hours of 25 (above max of 24)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', sleep_hours: 25 })
    expect(result.success).toBe(false)
  })

  it('rejects hunger_score of 0 (below min of 1)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', hunger_score: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects hunger_score of 6 (above max of 5)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', hunger_score: 6 })
    expect(result.success).toBe(false)
  })

  it('trims whitespace on notes', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', notes: '  trimmed  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('trimmed')
    }
  })

  it('accepts sleep_hours of 0 (boundary)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', sleep_hours: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts sleep_hours of 24 (boundary)', () => {
    const result = parseBody(DailyLogSchema, { log_date: '2024-03-15', sleep_hours: 24 })
    expect(result.success).toBe(true)
  })
})

// ─── CheckInSchema ─────────────────────────────────────────────────────────

describe('CheckInSchema', () => {
  const validCheckIn = {
    weight: 75,
    sleep_summary: 'Slept well',
    biggest_win: 'Hit my protein target',
    diet_summary: 'Clean eating all week',
    main_challenge: 'Late night snacking',
    focus_next_week: 'Meal prep on Sunday',
    avg_steps: '8500',
  }

  it('accepts a valid check-in with all fields', () => {
    const result = parseBody(CheckInSchema, validCheckIn)
    expect(result.success).toBe(true)
  })

  it('rejects weight below 20', () => {
    const result = parseBody(CheckInSchema, { ...validCheckIn, weight: 19 })
    expect(result.success).toBe(false)
  })

  it('accepts weight exactly at 20 (boundary)', () => {
    const result = parseBody(CheckInSchema, { ...validCheckIn, weight: 20 })
    expect(result.success).toBe(true)
  })

  it('rejects weight above 300', () => {
    const result = parseBody(CheckInSchema, { ...validCheckIn, weight: 301 })
    expect(result.success).toBe(false)
  })

  it('accepts weight exactly at 300 (boundary)', () => {
    const result = parseBody(CheckInSchema, { ...validCheckIn, weight: 300 })
    expect(result.success).toBe(true)
  })

  it('rejects empty sleep_summary', () => {
    const result = parseBody(CheckInSchema, { ...validCheckIn, sleep_summary: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required field biggest_win', () => {
    const { biggest_win: _omitted, ...rest } = validCheckIn
    const result = parseBody(CheckInSchema, rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing required field weight', () => {
    const { weight: _omitted, ...rest } = validCheckIn
    const result = parseBody(CheckInSchema, rest)
    expect(result.success).toBe(false)
  })
})

// ─── ProgrammeSchema ────────────────────────────────────────────────────────

describe('ProgrammeSchema', () => {
  const validExercise = {
    name: 'Squat',
    sets: 3,
    reps: '8-12',
  }

  const validProgram = {
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Strength Block',
    days: [
      {
        day_label: 'Day 1 - Push',
        exercises: [validExercise],
      },
    ],
  }

  it('accepts a valid programme with 1 day and 1 exercise', () => {
    const result = parseBody(ProgrammeSchema, validProgram)
    expect(result.success).toBe(true)
  })

  it('rejects empty days array (min 1)', () => {
    const result = parseBody(ProgrammeSchema, { ...validProgram, days: [] })
    expect(result.success).toBe(false)
  })

  it('rejects exercise sets of 0 (below min of 1)', () => {
    const result = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [{ day_label: 'Day 1', exercises: [{ ...validExercise, sets: 0 }] }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects exercise sets of 21 (above max of 20)', () => {
    const result = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [{ day_label: 'Day 1', exercises: [{ ...validExercise, sets: 21 }] }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts exercise sets at boundary values 1 and 20', () => {
    const result1 = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [{ day_label: 'Day 1', exercises: [{ ...validExercise, sets: 1 }] }],
    })
    const result20 = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [{ day_label: 'Day 1', exercises: [{ ...validExercise, sets: 20 }] }],
    })
    expect(result1.success).toBe(true)
    expect(result20.success).toBe(true)
  })

  it('rejects a non-URL video_url', () => {
    const result = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [{ day_label: 'Day 1', exercises: [{ ...validExercise, video_url: 'not-a-url' }] }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts video_url as null', () => {
    const result = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [{ day_label: 'Day 1', exercises: [{ ...validExercise, video_url: null }] }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid https video_url', () => {
    const result = parseBody(ProgrammeSchema, {
      ...validProgram,
      days: [
        {
          day_label: 'Day 1',
          exercises: [{ ...validExercise, video_url: 'https://youtube.com/watch?v=abc123' }],
        },
      ],
    })
    expect(result.success).toBe(true)
  })
})

// ─── NutritionTargetsSchema ────────────────────────────────────────────────

describe('NutritionTargetsSchema', () => {
  const validTargets = {
    client_id: '123e4567-e89b-12d3-a456-426614174000',
    td_calories: 0,
    td_protein: 0,
    td_carbs: 0,
    td_fat: 0,
    ntd_calories: 0,
    ntd_protein: 0,
    ntd_carbs: 0,
    ntd_fat: 0,
    daily_steps: 0,
    sleep_target_hours: 0,
  }

  it('accepts valid targets with all fields set to 0', () => {
    const result = parseBody(NutritionTargetsSchema, validTargets)
    expect(result.success).toBe(true)
  })

  it('rejects sleep_target_hours of 25 (above max 24)', () => {
    const result = parseBody(NutritionTargetsSchema, { ...validTargets, sleep_target_hours: 25 })
    expect(result.success).toBe(false)
  })

  it('accepts sleep_target_hours of 24 (boundary)', () => {
    const result = parseBody(NutritionTargetsSchema, { ...validTargets, sleep_target_hours: 24 })
    expect(result.success).toBe(true)
  })

  it('rejects a non-uuid client_id', () => {
    const result = parseBody(NutritionTargetsSchema, { ...validTargets, client_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects missing client_id', () => {
    const { client_id: _omitted, ...rest } = validTargets
    const result = parseBody(NutritionTargetsSchema, rest)
    expect(result.success).toBe(false)
  })
})

// ─── AINutritionSchema ─────────────────────────────────────────────────────

describe('AINutritionSchema', () => {
  const validAI = {
    td_calories: 2000,
    td_protein: 150,
    td_carbs: 200,
    td_fat: 70,
    ntd_calories: 1800,
    ntd_protein: 130,
    ntd_carbs: 180,
    ntd_fat: 65,
    daily_steps: 8000,
    sleep_target_hours: 8,
  }

  it('accepts valid AI nutrition output', () => {
    const result = parseBody(AINutritionSchema, validAI)
    expect(result.success).toBe(true)
  })

  it('rejects td_calories below 500', () => {
    const result = parseBody(AINutritionSchema, { ...validAI, td_calories: 499 })
    expect(result.success).toBe(false)
  })

  it('accepts td_calories at boundary 500', () => {
    const result = parseBody(AINutritionSchema, { ...validAI, td_calories: 500 })
    expect(result.success).toBe(true)
  })

  it('rejects td_calories above 10000', () => {
    const result = parseBody(AINutritionSchema, { ...validAI, td_calories: 10001 })
    expect(result.success).toBe(false)
  })

  it('accepts td_calories at boundary 10000', () => {
    const result = parseBody(AINutritionSchema, { ...validAI, td_calories: 10000 })
    expect(result.success).toBe(true)
  })

  it('rejects ntd_calories below 500', () => {
    const result = parseBody(AINutritionSchema, { ...validAI, ntd_calories: 499 })
    expect(result.success).toBe(false)
  })
})
