export type UserRole = 'coach' | 'client'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  onboarding_complete: boolean
  created_at: string
  avatar_url?: string | null
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
  midweek_check_day?: string
  is_active: boolean
  portal_access: boolean
  track_weight: boolean
  created_at: string
  goal_event_name?: string | null
  goal_event_date?: string | null
  welcome_video_url?: string | null
  welcome_video_views?: number
  weight_unit?: 'kg' | 'lbs'
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

export type TrackingStatus = 'yes' | 'slightly_off' | 'off'

export interface MidweekCheck {
  id: string
  client_id: string
  coach_id: string | null
  submitted_at: string
  week_number: number
  current_weight: number | null
  training_on_track: TrackingStatus
  food_on_track: TrackingStatus
  energy_level: number
  steps_on_track: boolean
  biggest_blocker: string | null
  voice_note_url?: string | null
}

export interface WeeklyCheckin {
  id: string
  client_id: string
  week_number: number
  check_in_date: string
  weight: number
  // New structured fields
  week_score: number | null
  energy_score: number | null
  sleep_score: number | null
  hunger_score: number | null
  cravings_score: number | null
  diet_rating: string | null
  training_completed: string | null
  focus_areas: string | null
  // Legacy text fields (kept for backward compat)
  week_summary: string | null
  diet_summary: string | null
  training_sessions: string | null
  energy_summary: string | null
  sleep_summary: string | null
  focus_next_week: string | null
  biggest_win: string | null
  main_challenge: string | null
  improve_next_week: string | null
  coach_support: string | null
  avg_steps: string | null
  anything_else: string | null
  coach_notes: string | null
  created_at: string
  voice_note_url?: string | null
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

export interface Supplement {
  id: string
  client_id: string
  name: string
  dose: string
  timing: string
  notes: string | null
  sort_order: number
  created_at: string
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

export interface WeeklyLoomVideo {
  id: string
  client_id: string
  coach_id: string
  loom_url: string
  week_number: number
  created_at: string
}

export interface ClientBadge {
  id: string
  client_id: string
  badge_key: string
  awarded_at: string
  awarded_by: string
}
