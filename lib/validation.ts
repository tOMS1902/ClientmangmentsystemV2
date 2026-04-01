import { z } from 'zod'

// ─── Primitives ───────────────────────────────────────────────────────────────

const uuid = z.string().uuid()
const score = z.number().int().min(1).max(5)
const nonEmptyStr = (max: number) => z.string().min(1).max(max).trim()
const optionalStr = (max: number) => z.string().max(max).trim().optional()
const positiveInt = z.number().int().min(0)
const positiveNum = z.number().min(0)

// ─── Clients ─────────────────────────────────────────────────────────────────

export const ClientPatchSchema = z.object({
  full_name: nonEmptyStr(100).optional(),
  phone: optionalStr(30),
  goal_weight: positiveNum.optional(),
  start_weight: positiveNum.optional(),
  current_weight: positiveNum.optional(),
  goal_text: optionalStr(500),
  check_in_day: z.enum(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).optional(),
  midweek_check_day: z.enum(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).optional(),
  is_active: z.boolean().optional(),
  portal_access: z.boolean().optional(),
  track_weight: z.boolean().optional(),
})

// ─── Midweek Checks ───────────────────────────────────────────────────────────

export const MidweekCheckSchema = z.object({
  current_weight: positiveNum.nullable().optional(),
  training_on_track: z.enum(['yes', 'slightly_off', 'off']),
  food_on_track: z.enum(['yes', 'slightly_off', 'off']),
  energy_level: score,
  steps_on_track: z.boolean(),
  biggest_blocker: optionalStr(500),
})

// ─── Weekly Check-Ins ─────────────────────────────────────────────────────────

export const CheckInSchema = z.object({
  weight: z.number().min(20).max(300),
  week_summary: nonEmptyStr(500),
  diet_summary: nonEmptyStr(500),
  training_sessions: nonEmptyStr(100),
  energy_summary: nonEmptyStr(500),
  sleep_summary: nonEmptyStr(500),
  biggest_win: nonEmptyStr(500),
  main_challenge: nonEmptyStr(500),
  focus_next_week: nonEmptyStr(500),
  improve_next_week: nonEmptyStr(500),
  coach_support: nonEmptyStr(500),
  avg_steps: nonEmptyStr(20),
  anything_else: optionalStr(500),
})

// ─── Programmes ───────────────────────────────────────────────────────────────

const ExerciseSchema = z.object({
  name: nonEmptyStr(100),
  sets: z.number().int().min(1).max(20),
  reps: nonEmptyStr(20),
  rest_seconds: z.number().int().min(0).max(600).nullable().optional(),
  video_url: z.string().url().max(500).nullable().optional(),
  notes: z.string().max(500).trim().nullable().optional(),
})

const ProgrammeDaySchema = z.object({
  day_label: nonEmptyStr(50),
  exercises: z.array(ExerciseSchema).max(30).default([]),
})

export const ProgrammeSchema = z.object({
  clientId: uuid,
  name: nonEmptyStr(100),
  days: z.array(ProgrammeDaySchema).min(1).max(14),
})

// ─── Nutrition Targets ────────────────────────────────────────────────────────

export const NutritionTargetsSchema = z.object({
  client_id: uuid,
  td_calories: positiveInt,
  td_protein: positiveInt,
  td_carbs: positiveInt,
  td_fat: positiveInt,
  ntd_calories: positiveInt,
  ntd_protein: positiveInt,
  ntd_carbs: positiveInt,
  ntd_fat: positiveInt,
  daily_steps: positiveInt,
  sleep_target_hours: z.number().min(0).max(24),
})

// ─── AI Nutrition Output ──────────────────────────────────────────────────────

export const AINutritionSchema = z.object({
  td_calories: z.number().int().min(500).max(10000),
  td_protein: z.number().int().min(0).max(500),
  td_carbs: z.number().int().min(0).max(1500),
  td_fat: z.number().int().min(0).max(500),
  ntd_calories: z.number().int().min(500).max(10000),
  ntd_protein: z.number().int().min(0).max(500),
  ntd_carbs: z.number().int().min(0).max(1500),
  ntd_fat: z.number().int().min(0).max(500),
  daily_steps: z.number().int().min(0).max(100000),
  sleep_target_hours: z.number().min(4).max(12),
})

// ─── Habits ───────────────────────────────────────────────────────────────────

export const HabitSchema = z.object({
  client_id: uuid,
  name: nonEmptyStr(100),
  description: optionalStr(300),
})

// ─── Meal Plans ───────────────────────────────────────────────────────────────

const MealItemSchema = z.object({
  name: nonEmptyStr(100),
  description: optionalStr(300),
  calories: positiveInt,
  protein: positiveInt,
  carbs: positiveInt,
  fat: positiveInt,
})

const MealSchema = z.object({
  name: nonEmptyStr(100),
  items: z.array(MealItemSchema).max(20),
})

export const MealPlanSchema = z.object({
  client_id: uuid,
  day_type: z.enum(['training', 'rest']),
  name: nonEmptyStr(100),
  meals: z.array(MealSchema).max(10),
  is_active: z.boolean().default(true),
})

// ─── Session Logs ─────────────────────────────────────────────────────────────

const SetEntrySchema = z.object({
  set_number: z.number().int().min(1).max(20),
  weight_kg: z.number().min(0).max(1000).nullable(),
  reps_completed: z.number().int().min(0).max(200).nullable(),
})

const ExerciseLogEntrySchema = z.object({
  exercise_id: uuid,
  exercise_name: nonEmptyStr(100),
  sets: z.array(SetEntrySchema).max(20),
})

export const SessionLogSchema = z.object({
  programme_day_id: uuid.nullable().optional(),
  day_label: nonEmptyStr(50),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exercises_logged: z.array(ExerciseLogEntrySchema).max(30),
  completed: z.boolean(),
})

// ─── Helper ───────────────────────────────────────────────────────────────────

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    return { success: false, error: msg }
  }
  return { success: true, data: result.data }
}
