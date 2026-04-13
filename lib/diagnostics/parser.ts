import type { ParsedMarkerInput } from '@/lib/types'

export interface ParseResult {
  success: boolean
  markers?: ParsedMarkerInput[]
  error?: string
}

const REQUIRED_FIELDS = ['marker_name', 'value', 'unit', 'reference_range_low', 'reference_range_high'] as const

function validateRow(row: Record<string, unknown>, index: number): { valid: true; marker: ParsedMarkerInput } | { valid: false; error: string } {
  for (const field of REQUIRED_FIELDS) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      return { valid: false, error: `Row ${index + 1}: missing required field '${field}'` }
    }
  }
  const name = String(row.marker_name).trim()
  if (!name) return { valid: false, error: `Row ${index + 1}: marker_name cannot be blank` }

  const value = Number(row.value)
  const low = Number(row.reference_range_low)
  const high = Number(row.reference_range_high)

  if (isNaN(value)) return { valid: false, error: `Row ${index + 1}: 'value' must be a number` }
  if (isNaN(low)) return { valid: false, error: `Row ${index + 1}: 'reference_range_low' must be a number` }
  if (isNaN(high)) return { valid: false, error: `Row ${index + 1}: 'reference_range_high' must be a number` }

  return {
    valid: true,
    marker: {
      marker_name: name,
      value,
      unit: String(row.unit || '').trim(),
      reference_range_low: low,
      reference_range_high: high,
      short_explanation: row.short_explanation ? String(row.short_explanation).trim() : undefined,
      category: row.category ? String(row.category).trim() as any : undefined,
    }
  }
}

function tryParseArray(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function salvageTruncated(input: string): { rows: unknown[]; truncated: boolean } {
  // Find the last complete object by scanning for closing braces
  let depth = 0
  let lastCompleteEnd = -1
  let inString = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) lastCompleteEnd = i
    }
  }

  if (lastCompleteEnd === -1) return { rows: [], truncated: true }

  // Wrap everything up to the last complete object in a valid array
  const start = input.indexOf('[')
  if (start === -1) return { rows: [], truncated: true }

  const salvaged = input.slice(start, lastCompleteEnd + 1).trimEnd().replace(/,\s*$/, '') + ']'
  const rows = tryParseArray(salvaged)
  return { rows: rows ?? [], truncated: true }
}

export function parseJSON(input: string): ParseResult {
  const trimmed = input.trim()

  // Try direct parse first
  let rows = tryParseArray(trimmed)
  let truncated = false

  // If that failed, try stripping markdown fences
  if (!rows) {
    const stripped = trimmed.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim()
    rows = tryParseArray(stripped)
  }

  // If still failed, attempt to salvage a truncated response
  if (!rows) {
    const salvage = salvageTruncated(trimmed)
    if (salvage.rows.length > 0) {
      rows = salvage.rows
      truncated = true
    } else {
      return { success: false, error: 'Invalid JSON — response may have been cut off. Scroll to the end in the AI tool and copy the full response.' }
    }
  }

  if (rows.length === 0) return { success: false, error: 'No markers found in JSON' }

  const markers: ParsedMarkerInput[] = []
  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i] as Record<string, unknown>, i)
    if (!result.valid) return { success: false, error: result.error }
    markers.push(result.marker)
  }

  const warning = truncated
    ? ` (response was truncated — last incomplete marker was skipped)`
    : undefined

  return { success: true, markers, error: warning }
}

export function parseCSV(input: string): ParseResult {
  const lines = input.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { success: false, error: 'CSV must have a header row and at least one data row' }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim().toLowerCase())
  const requiredLower = REQUIRED_FIELDS.map(f => f.toLowerCase())
  for (const req of requiredLower) {
    if (!headers.includes(req)) {
      return { success: false, error: `CSV is missing required column: '${req}'` }
    }
  }

  const markers: ParsedMarkerInput[] = []
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV values
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += char }
    }
    values.push(current.trim())

    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    const result = validateRow(row, i - 1)
    if (!result.valid) return { success: false, error: result.error }
    markers.push(result.marker)
  }

  return { success: true, markers }
}
