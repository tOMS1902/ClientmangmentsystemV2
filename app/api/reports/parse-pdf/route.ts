import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractJSON(text: string): unknown[] | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch { /* fall through */ }

  // Strip markdown fences and try again
  const stripped = text.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim()
  try {
    const parsed = JSON.parse(stripped)
    if (Array.isArray(parsed)) return parsed
  } catch { /* fall through */ }

  // Find first [ ... last ] in the text
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1))
      if (Array.isArray(parsed)) return parsed
    } catch { /* fall through */ }
  }

  return null
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Accept application/pdf or application/x-pdf or no type (some browsers omit it)
  const isPDF = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
  if (!isPDF) return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF too large (max 5 MB for extraction)' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: `You are a medical data extraction assistant. Read the blood test / lab results document and extract every biomarker listed.

IMPORTANT: Return ONLY a raw JSON array. No explanation, no markdown, no backticks, no preamble. Start your response with [ and end with ].

Each object in the array must have exactly these fields:
{
  "marker_name": "string — full name as printed (e.g. Haemoglobin, TSH, Ferritin)",
  "value": number,
  "unit": "string — unit of measurement, empty string if none",
  "reference_range_low": number,
  "reference_range_high": number,
  "category": "one of: Full Blood Count | Iron Status | Heart Health | Diabetes Health | Metabolic Syndrome | Kidney Health | Liver Health | Nutritional Health | Muscle & Joint Health | Bone Health | Infection & Inflammation | Pituitary & Adrenal Health | Thyroid Health | Stress Health | Hormonal Health"
}

Rules:
- value, reference_range_low, reference_range_high must all be numbers
- If range is "< 5.0" use reference_range_low: 0, reference_range_high: 5.0
- If range is "> 60" use reference_range_low: 60, reference_range_high: 9999
- Skip rows where you cannot determine a numeric value or range
- Do not invent or estimate — only extract what is printed
- If no markers found return []`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract all biomarkers from this blood test report. Return only the JSON array.',
            },
          ],
        },
      ],
    })

    const rawText: string = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    console.log('[parse-pdf] raw response length:', rawText.length)
    console.log('[parse-pdf] raw response preview:', rawText.slice(0, 300))

    const markers = extractJSON(rawText)
    if (!markers) {
      console.error('[parse-pdf] could not extract JSON from:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'The AI could not structure the data from this PDF. Try copying the results and using the Paste JSON tab instead.' },
        { status: 422 },
      )
    }

    // Sanitise each marker
    const clean = markers
      .map((m: unknown) => {
        if (typeof m !== 'object' || !m) return null
        const o = m as Record<string, unknown>
        const val = parseFloat(String(o.value))
        const low = parseFloat(String(o.reference_range_low))
        const high = parseFloat(String(o.reference_range_high))
        if (isNaN(val) || isNaN(low) || isNaN(high)) return null
        const name = String(o.marker_name || '').trim()
        if (!name) return null
        return {
          marker_name: name,
          value: val,
          unit: String(o.unit || '').trim(),
          reference_range_low: low,
          reference_range_high: high,
          category: String(o.category || ''),
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    if (clean.length === 0) {
      return NextResponse.json(
        { error: 'No markers could be extracted from this PDF. The format may not be recognised — try the JSON or CSV tab.' },
        { status: 422 },
      )
    }

    console.log('[parse-pdf] extracted', clean.length, 'markers')
    return NextResponse.json({ markers: clean, count: clean.length })
  } catch (e) {
    console.error('[parse-pdf] error:', e)
    return NextResponse.json(
      { error: 'PDF extraction failed. Please try again or use the JSON/CSV tab.' },
      { status: 500 },
    )
  }
}
