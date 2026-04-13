import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function classifyMarker(value: number, refLow: number, refHigh: number): string {
  if (refLow === refHigh) return 'optimal'
  const range = refHigh - refLow
  const buffer = range * 0.08
  if (value < refLow - buffer) return 'low'
  if (value > refHigh + buffer) return 'high'
  if (value < refLow) return 'borderline-low'
  if (value > refHigh) return 'borderline-high'
  return 'optimal'
}

const CATEGORY_MAP: Record<string, string> = {
  'Cortisol': 'Stress Health', 'DHEA-S': 'Pituitary & Adrenal Health', 'ACTH': 'Pituitary & Adrenal Health',
  'TSH': 'Thyroid Health', 'Free T4': 'Thyroid Health', 'Free T3': 'Thyroid Health', 'Anti-TPO': 'Thyroid Health',
  'Testosterone (total)': 'Hormonal Health', 'Testosterone (free)': 'Hormonal Health', 'SHBG': 'Hormonal Health',
  'FAI': 'Hormonal Health', 'Free Androgen Index': 'Hormonal Health', 'LH': 'Hormonal Health', 'FSH': 'Hormonal Health',
  'Oestradiol': 'Hormonal Health', 'Prolactin': 'Hormonal Health', 'Progesterone': 'Hormonal Health',
  'Fasting Glucose': 'Diabetes Health', 'HbA1c': 'Diabetes Health', 'Fasting Insulin': 'Diabetes Health', 'HOMA-IR': 'Diabetes Health',
  'Total Cholesterol': 'Heart Health', 'LDL': 'Heart Health', 'HDL': 'Heart Health', 'Triglycerides': 'Heart Health',
  'Non-HDL': 'Heart Health', 'ApoB': 'Heart Health', 'Lp(a)': 'Heart Health',
  'Haemoglobin': 'Full Blood Count', 'Haematocrit': 'Full Blood Count', 'RBC': 'Full Blood Count', 'WBC': 'Full Blood Count',
  'Platelets': 'Full Blood Count', 'MCV': 'Full Blood Count', 'MCH': 'Full Blood Count', 'MCHC': 'Full Blood Count',
  'Neutrophils': 'Full Blood Count', 'Lymphocytes': 'Full Blood Count', 'Monocytes': 'Full Blood Count',
  'Eosinophils': 'Full Blood Count', 'Basophils': 'Full Blood Count',
  'Ferritin': 'Iron Status', 'Serum Iron': 'Iron Status', 'TIBC': 'Iron Status', 'Transferrin Saturation': 'Iron Status',
  'Creatinine': 'Kidney Health', 'eGFR': 'Kidney Health', 'Urea': 'Kidney Health', 'Cystatin C': 'Kidney Health', 'Albumin': 'Kidney Health',
  'Uric Acid': 'Muscle & Joint Health',
  'ALT': 'Liver Health', 'AST': 'Liver Health', 'GGT': 'Liver Health', 'ALP': 'Liver Health', 'Bilirubin': 'Liver Health', 'Total Protein': 'Liver Health',
  'Vitamin D': 'Nutritional Health', 'B12': 'Nutritional Health', 'Vitamin B12': 'Nutritional Health', 'Folate': 'Nutritional Health',
  'Zinc': 'Nutritional Health', 'Magnesium': 'Nutritional Health', 'Calcium': 'Nutritional Health', 'Phosphate': 'Nutritional Health',
  'Selenium': 'Nutritional Health', 'Omega-3 Index': 'Nutritional Health',
  'CRP': 'Infection & Inflammation', 'hsCRP': 'Infection & Inflammation', 'ESR': 'Infection & Inflammation',
  'CK': 'Muscle & Joint Health', 'Creatine Kinase': 'Muscle & Joint Health',
}

const EXPLANATIONS: Record<string, string> = {
  'Cortisol': 'Elevated cortisol indicates chronic stress load. Key driver of sleep disruption, fat storage, and testosterone suppression.',
  'DHEA-S': 'An adrenal hormone that counterbalances cortisol. Low levels combined with high cortisol indicate adrenal fatigue pattern.',
  'Testosterone (total)': 'Low-normal testosterone is commonly driven by elevated cortisol and poor sleep — not always a standalone issue.',
  'SHBG': 'Sex hormone binding globulin. High SHBG reduces free (active) testosterone even when total is normal.',
  'FAI': 'A ratio that estimates how much active testosterone is available for the body to use.',
  'Free Androgen Index': 'A ratio that estimates how much active testosterone is available for the body to use.',
  'Fasting Glucose': 'Borderline elevated fasting glucose signals early insulin resistance. Directly addressable through diet, sleep, and stress management.',
  'HbA1c': 'Reflects average blood sugar over the past 3 months. Trending up indicates developing metabolic stress.',
  'Fasting Insulin': 'A more sensitive marker of insulin resistance than glucose alone. Elevated even before glucose rises.',
  'Vitamin D': 'Borderline insufficient — extremely common in Ireland. Low Vitamin D affects immunity, mood, hormonal function, and recovery.',
  'Ferritin': 'Iron storage marker. Low ferritin impacts energy, recovery, and cognitive performance.',
  'TSH': 'Primary thyroid screening marker. Outside range suggests thyroid dysfunction.',
  'Free T3': 'The active form of thyroid hormone. Low Free T3 can cause fatigue and slow metabolism even when TSH is normal.',
  'Total Cholesterol': 'Overall cholesterol level. Context matters — assess alongside HDL, LDL, and triglyceride ratio.',
  'LDL': 'Low-density lipoprotein. Elevated LDL is a cardiovascular risk marker.',
  'HDL': "High-density lipoprotein ('good' cholesterol). Low HDL increases cardiovascular risk.",
  'Triglycerides': 'Elevated triglycerides are a metabolic dysfunction marker, commonly driven by refined carbohydrates and alcohol intake.',
  'hsCRP': 'High-sensitivity CRP measures systemic inflammation. Elevated levels indicate ongoing inflammatory load.',
  'ALT': 'Liver enzyme. Elevated ALT indicates liver stress — commonly from alcohol, dietary fat load, or training overload.',
  'Creatinine': 'Kidney filtration marker. Elevated creatinine may indicate reduced kidney function.',
  'eGFR': 'Estimated glomerular filtration rate — a direct measure of how well the kidneys are filtering blood.',
  'Vitamin B12': 'Essential for energy, nerve function, and red blood cell production. Low B12 can cause fatigue and cognitive impairment.',
  'B12': 'Essential for energy, nerve function, and red blood cell production.',
  'Folate': 'B vitamin critical for cell function and DNA repair. Low folate often co-occurs with low B12.',
}

function getCategory(name: string): string {
  return (
    CATEGORY_MAP[name] ||
    Object.entries(CATEGORY_MAP).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] ||
    'Full Blood Count'
  )
}

function getExplanation(name: string): string {
  return (
    EXPLANATIONS[name] ||
    Object.entries(EXPLANATIONS).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] ||
    ''
  )
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  if (!Array.isArray(body?.markers) || body.markers.length === 0) {
    return NextResponse.json({ error: 'markers array is required' }, { status: 400 })
  }

  const toInsert = body.markers.map((m: any, i: number) => {
    const status = classifyMarker(
      Number(m.value),
      Number(m.reference_range_low),
      Number(m.reference_range_high),
    )
    const category = m.category || getCategory(m.marker_name)
    const explanation = m.short_explanation || getExplanation(m.marker_name)
    return {
      report_id: id,
      marker_name: String(m.marker_name).trim(),
      value: Number(m.value),
      unit: String(m.unit || '').trim(),
      reference_range_low: Number(m.reference_range_low),
      reference_range_high: Number(m.reference_range_high),
      status,
      category,
      short_explanation: explanation,
      coach_note: '',
      recommendation: '',
      is_flagged: status !== 'optimal',
      display_order: i,
    }
  })

  const { data: created, error: insertError } = await supabase
    .from('diagnostic_markers')
    .insert(toInsert)
    .select()

  if (insertError) {
    console.error('[markers/bulk] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save markers' }, { status: 500 })
  }

  // Recalculate health score
  const total = created!.length
  const optimal = created!.filter((m: any) => m.status === 'optimal').length
  const healthScore = total > 0 ? Math.round((optimal / total) * 100) : 0
  await supabase.from('diagnostic_reports').update({ health_score: healthScore }).eq('id', id)

  return NextResponse.json(created, { status: 201 })
}
