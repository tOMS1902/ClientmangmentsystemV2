/**
 * Client Migration Script
 * Usage: node scripts/migrate-client.js "path/to/Client Name.xlsx"
 *
 * Reads a coach Google Sheets export (Excel format) and outputs
 * ready-to-run SQL for the Supabase database.
 *
 * Handles mismatched / missing data gracefully — anything that
 * doesn't fit a specific column lands in onboarding_responses JSONB.
 */

const xlsx = require('xlsx')
const path = require('path')

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Excel date serial to YYYY-MM-DD string */
function excelDateToString(serial) {
  if (!serial) return null
  if (typeof serial === 'string') {
    // e.g. "1/16/26" or "1/16/2026"
    const parts = serial.split('/')
    if (parts.length === 3) {
      let year = parseInt(parts[2])
      if (year < 100) year += 2000
      const m = String(parseInt(parts[0])).padStart(2, '0')
      const d = String(parseInt(parts[1])).padStart(2, '0')
      return `${year}-${m}-${d}`
    }
    return serial
  }
  if (typeof serial === 'number') {
    const d = new Date(Math.round((serial - 25569) * 864e5))
    const year = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${m}-${day}`
  }
  return null
}

/** Add N weeks to a date string */
function addWeeks(dateStr, weeks) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

/** Convert lbs string/number to kg (rounded to 1dp) */
function lbsToKg(val) {
  if (!val) return null
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return null
  return Math.round(num * 0.453592 * 10) / 10
}

/** Escape a value for SQL — returns NULL or a quoted string */
function sql(val) {
  if (val === null || val === undefined || val === '' || val === '§') return 'NULL'
  return `'${String(val).replace(/\n/g, ' ').replace(/\r/g, '').replace(/'/g, "''").trim()}'`
}

/** Find a value in a 2D array by its label in col B (index 1), return col E (index 4) */
function findDashValue(rows, label) {
  for (const row of rows) {
    for (let i = 0; i < row.length - 1; i++) {
      if (row[i] && String(row[i]).trim() === label) {
        return row[4] ?? row[i + 1] ?? row[i + 2] ?? null
      }
    }
  }
  return null
}

// ─── Load workbook ────────────────────────────────────────────────────────────

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/migrate-client.js "path/to/file.xlsx"')
  process.exit(1)
}

let wb
try {
  wb = xlsx.readFile(filePath)
} catch (e) {
  console.error('Could not read file:', filePath)
  process.exit(1)
}

const clientFileName = path.basename(filePath, path.extname(filePath))

// ─── Dashboard ────────────────────────────────────────────────────────────────

const dashRows = wb.Sheets['Dashboard']
  ? xlsx.utils.sheet_to_json(wb.Sheets['Dashboard'], { header: 1, defval: null })
  : []

const name          = findDashValue(dashRows, 'NAME') || clientFileName
const age           = findDashValue(dashRows, 'AGE (yrs)')
const heightCm      = findDashValue(dashRows, 'HEIGHT (cm)')
const startWtLbs    = findDashValue(dashRows, 'START WEIGHT (lbs)')
const curWtLbs      = findDashValue(dashRows, 'CURRENT WEIGHT (lbs)')
const startDateRaw  = findDashValue(dashRows, 'START DATE')
const goalText      = findDashValue(dashRows, 'OVERARCHING GOAL')
const goalDateRaw   = findDashValue(dashRows, 'GOAL DATE')
const checkinDay    = findDashValue(dashRows, 'CHECK-IN DAY')

const startWeightKg  = lbsToKg(startWtLbs)
const currentWeightKg = lbsToKg(curWtLbs)
const startDate      = excelDateToString(startDateRaw)
const goalDate       = excelDateToString(goalDateRaw)

// Nutrition targets (TD / NTD rows in the dashboard)
let tdCals, tdPro, tdCarbs, tdFat, ntdCals, ntdPro, ntdCarbs, ntdFat, dailySteps
for (const row of dashRows) {
  if (row[8] === 'TD')  { tdCals  = row[9]; tdPro  = row[10]; tdCarbs  = row[11]; tdFat  = row[12] }
  if (row[8] === 'NTD') { ntdCals = row[9]; ntdPro = row[10]; ntdCarbs = row[11]; ntdFat = row[12] }
  if (row[8] === 'STEPS' || (row[8] && String(row[8]).toLowerCase().includes('step'))) {
    const stepVal = String(row[9] || '').replace(/[^0-9]/g, '')
    if (stepVal) dailySteps = parseInt(stepVal)
  }
}

// Try to pull step target from activity section
for (const row of dashRows) {
  if (row[8] && String(row[8]).match(/\d+k\s*daily/i)) {
    const m = String(row[8]).match(/(\d+)k/i)
    if (m) dailySteps = parseInt(m[1]) * 1000
  }
}
if (!dailySteps) dailySteps = 8000 // fallback

// Short/long term goals
const shortTermGoals = []
const longTermGoals  = []
let mode = null
for (const row of dashRows) {
  const col1 = row[1] ? String(row[1]).trim() : ''
  if (col1.includes('SHORT TERM')) { mode = 'short'; continue }
  if (col1.includes('LONG TERM'))  { mode = 'long';  continue }
  if (mode === 'short' && typeof row[1] === 'number' && row[2]) shortTermGoals.push(String(row[2]).trim().replace(/\n/g, ' '))
  if (mode === 'long'  && typeof row[1] === 'number' && row[2]) longTermGoals.push(String(row[2]).trim().replace(/\n/g, ' '))
}

// ─── Check-Ins ────────────────────────────────────────────────────────────────

const checkinRows = wb.Sheets['Check-In']
  ? xlsx.utils.sheet_to_json(wb.Sheets['Check-In'], { header: 1, defval: null })
  : []

// Row index 5 = header (WEEK 1, WEEK 2...), week data starts at col index 6
const WEEK_START_COL = 6
const ROW = {
  date:         6,   // "Date of check in"
  weight:       7,   // "Weight (KG)" — actually lbs in this sheet
  sleep:        8,   // "Average Sleep"
  biggestWin:   9,   // "Biggest Win"
  training:     10,  // "How many training sessions"
  diet:         11,  // "How was your diet"
  roadblocks:   12,  // "Any roadblocks"
  focusNext:    13,  // "One Thing to Improve/Focus"
  missingFromCoaching: 14,
}

const checkins = []
const maxCol = (checkinRows[ROW.weight] || []).length

for (let col = WEEK_START_COL; col < maxCol; col++) {
  const weekNum   = col - WEEK_START_COL + 1
  const weightVal = checkinRows[ROW.weight]?.[col]
  const dateVal   = checkinRows[ROW.date]?.[col]

  if (!weightVal && !dateVal) continue // no data for this week

  // If no date recorded, estimate from start date
  const dateStr = excelDateToString(dateVal) || addWeeks(startDate, weekNum - 1)

  checkins.push({
    weekNum,
    date:       dateStr,
    weightKg:   lbsToKg(weightVal),
    sleep:      checkinRows[ROW.sleep]?.[col],
    biggestWin: checkinRows[ROW.biggestWin]?.[col],
    training:   checkinRows[ROW.training]?.[col],
    diet:       checkinRows[ROW.diet]?.[col],
    roadblocks: checkinRows[ROW.roadblocks]?.[col],
    focusNext:  checkinRows[ROW.focusNext]?.[col],
    extra:      checkinRows[ROW.missingFromCoaching]?.[col],
  })
}

// ─── Supplements ─────────────────────────────────────────────────────────────

const suppRows = wb.Sheets['Supplements']
  ? xlsx.utils.sheet_to_json(wb.Sheets['Supplements'], { header: 1, defval: null })
  : []

const supplements = []
for (const row of suppRows) {
  const name_ = row[1] ? String(row[1]).trim() : null
  const dose   = row[2] ? String(row[2]).trim() : null
  const timing = row[3] ? String(row[3]).trim() : null
  if (!name_ || name_ === 'SUPPLEMENT' || name_ === 'SUPPLEMENT RECOMMENDATIONS') continue
  if (name_ && dose && timing) supplements.push({ name: name_, dose, timing, notes: row[4] || null })
}

// ─── Generate SQL ─────────────────────────────────────────────────────────────

const out = []
const p = (...args) => out.push(args.join(''))

p(`-- ================================================================`)
p(`-- MIGRATION: ${name}`)
p(`-- Generated: ${new Date().toISOString()}`)
p(`-- Source:    ${path.basename(filePath)}`)
p(`-- `)
p(`-- BEFORE RUNNING:`)
p(`--   1. Find your UUIDs by running in Supabase SQL Editor:`)
p(`--        SELECT id, email, role FROM profiles ORDER BY created_at DESC LIMIT 20;`)
p(`--   2. Replace COACH_UUID with the coach's id from profiles`)
p(`--   3. If ${name} has already signed up, replace CLIENT_PROFILE_UUID`)
p(`--      with their id from profiles. Otherwise delete steps 5 and 6.`)
p(`-- ================================================================`)
p(``)

p(`-- ── STEP 1: Create client record ────────────────────────────────`)
p(`INSERT INTO clients (`)
p(`  coach_id, full_name, start_date, start_weight,`)
p(`  current_weight, goal_text, check_in_day, is_active, portal_access`)
p(`)`)
p(`VALUES (`)
p(`  'COACH_UUID',`)
p(`  ${sql(name)},`)
p(`  ${sql(startDate)},`)
p(`  ${startWeightKg ?? 'NULL'},`)
p(`  ${currentWeightKg ?? 'NULL'},`)
p(`  ${sql(goalText ? String(goalText).trim() : null)},`)
p(`  ${sql(checkinDay)},`)
p(`  true,`)
p(`  false`)
p(`) RETURNING id;`)
p(``)
p(`-- !! Copy the id returned above and replace every CLIENTS_ID below !!`)
p(``)

if (tdCals || ntdCals) {
  p(`-- ── STEP 2: Nutrition targets ────────────────────────────────────`)
  p(`INSERT INTO nutrition_targets (`)
  p(`  client_id,`)
  p(`  td_calories,  td_protein,  td_carbs,  td_fat,`)
  p(`  ntd_calories, ntd_protein, ntd_carbs, ntd_fat,`)
  p(`  daily_steps`)
  p(`)`)
  p(`VALUES (`)
  p(`  'CLIENTS_ID',`)
  p(`  ${tdCals ?? 'NULL'},  ${tdPro ?? 'NULL'},  ${tdCarbs ?? 'NULL'},  ${tdFat ?? 'NULL'},`)
  p(`  ${ntdCals ?? 'NULL'}, ${ntdPro ?? 'NULL'}, ${ntdCarbs ?? 'NULL'}, ${ntdFat ?? 'NULL'},`)
  p(`  ${dailySteps}`)
  p(`) ON CONFLICT (client_id) DO UPDATE SET`)
  p(`  td_calories  = EXCLUDED.td_calories,  td_protein  = EXCLUDED.td_protein,`)
  p(`  td_carbs     = EXCLUDED.td_carbs,     td_fat      = EXCLUDED.td_fat,`)
  p(`  ntd_calories = EXCLUDED.ntd_calories, ntd_protein = EXCLUDED.ntd_protein,`)
  p(`  ntd_carbs    = EXCLUDED.ntd_carbs,    ntd_fat     = EXCLUDED.ntd_fat,`)
  p(`  daily_steps  = EXCLUDED.daily_steps;`)
  p(``)
}

if (checkins.length > 0) {
  p(`-- ── STEP 3: Weekly check-ins (${checkins.length} weeks of data) ────────────────`)
  for (const c of checkins) {
    p(`INSERT INTO weekly_checkins (`)
    p(`  client_id, week_number, check_in_date, weight,`)
    p(`  biggest_win, diet_summary, training_sessions,`)
    p(`  main_challenge, focus_next_week, anything_else`)
    p(`)`)
    p(`VALUES (`)
    p(`  'CLIENTS_ID', ${c.weekNum}, ${sql(c.date)}, ${c.weightKg ?? 'NULL'},`)
    p(`  ${sql(c.biggestWin)},`)
    p(`  ${sql(c.diet)},`)
    p(`  ${sql(c.training)},`)
    p(`  ${sql(c.roadblocks)},`)
    p(`  ${sql(c.focusNext)},`)
    p(`  ${sql(c.extra)}`)
    p(`) ON CONFLICT (client_id, week_number) DO NOTHING;`)
    p(``)
  }
}

if (supplements.length > 0) {
  p(`-- ── STEP 4: Supplements ─────────────────────────────────────────`)
  supplements.forEach((s, i) => {
    p(`INSERT INTO supplements (client_id, name, dose, timing, notes, sort_order)`)
    p(`VALUES ('CLIENTS_ID', ${sql(s.name)}, ${sql(s.dose)}, ${sql(s.timing)}, ${sql(s.notes)}, ${i + 1});`)
  })
  p(``)
}

if (goalDate) {
  p(`-- ── STEP 5: Goal event ──────────────────────────────────────────`)
  p(`INSERT INTO client_goals (client_id, event_name, event_date)`)
  p(`VALUES ('CLIENTS_ID', ${sql(goalText ? String(goalText).trim() : 'Goal')}, ${sql(goalDate)});`)
  p(``)
}

p(`-- ── STEP 6: Onboarding responses ────────────────────────────────`)
p(`-- Only run this block if ${name} has already created an account.`)
p(`-- client_id here = profiles.id (NOT clients.id)`)
p(`INSERT INTO onboarding_responses (client_id, responses)`)
p(`VALUES (`)
p(`  'CLIENT_PROFILE_UUID',`)
p(`  jsonb_build_object(`)
p(`    'full_name',           ${sql(name)},`)
p(`    'age',                 ${sql(age ? String(age) : null)},`)
p(`    'height',              ${sql(heightCm ? String(heightCm) + 'cm' : null)},`)
p(`    'weight_kg',           ${sql(currentWeightKg ? String(currentWeightKg) + 'kg' : null)},`)
p(`    'primary_goals',       ${sql(goalText ? String(goalText).trim() : null)},`)
if (shortTermGoals.length) {
  p(`    'short_term_goals',    ${sql(shortTermGoals.join(' | '))},`)
}
if (longTermGoals.length) {
  p(`    'long_term_goals',     ${sql(longTermGoals.join(' | '))},`)
}
p(`    'daily_steps',         ${sql(dailySteps ? String(dailySteps) : null)}`)
p(`  )`)
p(`)`)
p(`ON CONFLICT (client_id) DO UPDATE SET responses = EXCLUDED.responses;`)
p(``)
p(`-- ================================================================`)
p(`-- Done. ${checkins.length} check-in weeks | ${supplements.length} supplements`)
p(`-- ${goalDate ? 'Goal date: ' + goalDate : 'No goal date found'}`)
p(`-- ================================================================`)

console.log(out.join('\n'))
