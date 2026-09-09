import type { ProgrammeDay, PlanDayType, PlanNutritionType, PlanItemType, NutritionTargets } from './types'

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const DAY_LABELS_FULL = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const

/**
 * Returns the Monday (ISO week start) date string for any given date.
 * Always returns YYYY-MM-DD format.
 */
export function getWeekMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/**
 * Shifts a Monday date string by a number of weeks.
 */
export function shiftWeek(monday: string, weeks: number): string {
  const d = new Date(monday + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

/**
 * Formats a week range string like "26 Aug – 1 Sep 2026"
 */
export function formatWeekRange(monday: string): string {
  const start = new Date(monday + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const startStr = start.toLocaleDateString('en-GB', opts)
  const endStr = end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })
  return `${startStr} – ${endStr}`
}

interface PlanDayFromProgramme {
  day_of_week: number
  day_type: PlanDayType
  nutrition_type: PlanNutritionType
  programme_day_id: string | null
  items: Array<{
    item_type: PlanItemType
    title: string
    description: string | null
    target: string | null
    programme_day_id: string | null
    sort_order: number
  }>
}

/**
 * Maps programme days to a 7-day plan structure.
 * Assigns programme days sequentially to weekdays, remaining days are rest.
 */
export function buildPlanFromProgramme(
  programmeDays: ProgrammeDay[],
  dayMapping?: Record<number, string>
): PlanDayFromProgramme[] {
  const plan: PlanDayFromProgramme[] = []

  // Sort programme days by sort_order (or day_number fallback) before mapping
  const sorted = [...programmeDays].sort((a, b) =>
    (a.sort_order ?? a.day_number ?? 0) - (b.sort_order ?? b.day_number ?? 0)
  )

  // If no explicit mapping, assign sorted programme days sequentially starting Monday
  const mapping = dayMapping ?? Object.fromEntries(
    sorted.map((pd, i) => [i, pd.id])
  )

  for (let dow = 0; dow < 7; dow++) {
    const progDay = sorted.find(pd => {
      const mappedId = Object.entries(mapping).find(([k]) => Number(k) === dow)?.[1]
      return mappedId === pd.id
    })

    if (progDay) {
      plan.push({
        day_of_week: dow,
        day_type: 'training',
        nutrition_type: 'training',
        programme_day_id: progDay.id,
        items: [
          {
            item_type: 'training',
            title: progDay.day_label,
            description: `${progDay.exercises.length} exercises`,
            target: null,
            programme_day_id: progDay.id,
            sort_order: 0,
          },
        ],
      })
    } else {
      plan.push({
        day_of_week: dow,
        day_type: 'rest',
        nutrition_type: 'rest',
        programme_day_id: null,
        items: [],
      })
    }
  }

  return plan
}

/**
 * Formats macro targets for display based on nutrition day type.
 * Returns a string like "2,500 kcal | P 180 | C 300 | F 65"
 */
export function formatMacros(targets: NutritionTargets | null, nutritionType: PlanNutritionType): string | null {
  if (!targets) return null
  const isTraining = nutritionType === 'training'
  const cal = isTraining ? targets.td_calories : targets.ntd_calories
  const p = isTraining ? targets.td_protein : targets.ntd_protein
  const c = isTraining ? targets.td_carbs : targets.ntd_carbs
  const f = isTraining ? targets.td_fat : targets.ntd_fat
  if (!cal) return null
  return `${cal.toLocaleString()} kcal | P ${p} | C ${c} | F ${f}`
}
