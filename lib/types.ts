export type UserRole = 'coach' | 'client'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  onboarding_complete: boolean
  created_at: string
}

export interface Client {
  id: string
  user_id: string | null
  coach_id: string
  full_name: string
  email: string
  phone: string
  start_date: string
  goal_weight: number
  start_weight: number
  current_weight: number
  goal_text: string
  check_in_day: string
  is_active: boolean
  portal_access: boolean
  created_at: string
}

export interface NutritionTargets {
  id: string
  client_id: string
  td_calories: number
  td_protein: number
  td_carbs: number
  td_fat: number
  ntd_calories: number
  ntd_protein: number
  ntd_carbs: number
  ntd_fat: number
  daily_steps: number
  sleep_target_hours: number
  updated_at: string
}

export interface DailyLog {
  id: string
  client_id: string
  log_date: string
  calories: number | null
  protein: number | null
  steps: number | null
  sleep_hours: number | null
  hunger_score: number | null
  energy_score: number | null
  stress_score: number | null
  training_done: boolean | null
  training_notes: string | null
  notes: string | null
  created_at: string
}

export interface WeeklyCheckin {
  id: string
  client_id: string
  week_number: number
  check_in_date: string
  weight: number
  sleep_summary: string
  biggest_win: string
  diet_summary: string
  main_challenge: string
  focus_next_week: string
  avg_steps: string
  coach_notes: string | null
  created_at: string
}

export interface Programme {
  id: string
  client_id: string
  name: string
  is_active: boolean
  created_at: string
  days: ProgrammeDay[]
}

export interface ProgrammeDay {
  id: string
  programme_id: string
  day_number: number
  day_label: string
  sort_order: number
  exercises: Exercise[]
}

export interface Exercise {
  id: string
  day_id: string
  name: string
  sets: number
  reps: string
  rest_seconds: number | null
  video_url: string | null
  notes: string | null
  sort_order: number
}

export interface SessionLog {
  id: string
  client_id: string
  programme_day_id: string | null
  day_label: string
  log_date: string
  exercises_logged: ExerciseLogEntry[]
  completed: boolean
  created_at: string
}

export interface ExerciseLogEntry {
  exercise_id: string
  exercise_name: string
  sets: SetEntry[]
}

export interface SetEntry {
  set_number: number
  weight_kg: number | null
  reps_completed: number | null
}

export interface Habit {
  id: string
  client_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  client_id: string
  log_date: string
  completed: boolean
}

export interface MealPlan {
  id: string
  client_id: string
  day_type: 'training' | 'rest'
  name: string
  meals: Meal[]
  is_active: boolean
}

export interface Meal {
  name: string
  items: MealItem[]
}

export interface MealItem {
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface OnboardingResponses {
  id: string
  client_id: string
  responses: Record<string, string>
  created_at: string
}

export interface Message {
  id: string
  client_id: string
  sender_role: 'coach' | 'client'
  body: string       // base64-encoded AES-GCM ciphertext
  iv: string | null  // base64-encoded 12-byte AES-GCM IV
  is_read: boolean
  created_at: string
}

export interface CheckInPhoto {
  id: string
  client_id: string
  check_in_id: string | null
  week_number: number
  photo_type: 'front' | 'back'
  storage_path: string
  file_size_bytes: number | null
  uploaded_by: 'client' | 'coach'
  created_at: string
  signed_url?: string  // generated on-demand, not stored in DB
}
