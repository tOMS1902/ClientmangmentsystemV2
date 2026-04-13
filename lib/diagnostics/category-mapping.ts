import type { MarkerCategory } from '@/lib/types'

const CATEGORY_MAP: Record<string, MarkerCategory> = {
  'Cortisol': 'Stress Health',
  'DHEA-S': 'Pituitary & Adrenal Health',
  'ACTH': 'Pituitary & Adrenal Health',
  'TSH': 'Thyroid Health',
  'Free T4': 'Thyroid Health',
  'Free T3': 'Thyroid Health',
  'Anti-TPO': 'Thyroid Health',
  'Testosterone (total)': 'Hormonal Health',
  'Testosterone (free)': 'Hormonal Health',
  'SHBG': 'Hormonal Health',
  'FAI': 'Hormonal Health',
  'Free Androgen Index': 'Hormonal Health',
  'LH': 'Hormonal Health',
  'FSH': 'Hormonal Health',
  'Oestradiol': 'Hormonal Health',
  'Prolactin': 'Hormonal Health',
  'Progesterone': 'Hormonal Health',
  'Fasting Glucose': 'Diabetes Health',
  'HbA1c': 'Diabetes Health',
  'Fasting Insulin': 'Diabetes Health',
  'HOMA-IR': 'Diabetes Health',
  'Total Cholesterol': 'Heart Health',
  'LDL': 'Heart Health',
  'HDL': 'Heart Health',
  'Triglycerides': 'Heart Health',
  'Non-HDL': 'Heart Health',
  'ApoB': 'Heart Health',
  'Lp(a)': 'Heart Health',
  'Haemoglobin': 'Full Blood Count',
  'Haematocrit': 'Full Blood Count',
  'RBC': 'Full Blood Count',
  'WBC': 'Full Blood Count',
  'Platelets': 'Full Blood Count',
  'MCV': 'Full Blood Count',
  'MCH': 'Full Blood Count',
  'MCHC': 'Full Blood Count',
  'Neutrophils': 'Full Blood Count',
  'Lymphocytes': 'Full Blood Count',
  'Monocytes': 'Full Blood Count',
  'Eosinophils': 'Full Blood Count',
  'Basophils': 'Full Blood Count',
  'Ferritin': 'Iron Status',
  'Serum Iron': 'Iron Status',
  'TIBC': 'Iron Status',
  'Transferrin Saturation': 'Iron Status',
  'Creatinine': 'Kidney Health',
  'eGFR': 'Kidney Health',
  'Urea': 'Kidney Health',
  'Uric Acid': 'Muscle & Joint Health',
  'Cystatin C': 'Kidney Health',
  'Albumin': 'Kidney Health',
  'ALT': 'Liver Health',
  'AST': 'Liver Health',
  'GGT': 'Liver Health',
  'ALP': 'Liver Health',
  'Bilirubin': 'Liver Health',
  'Total Protein': 'Liver Health',
  'Vitamin D': 'Nutritional Health',
  'B12': 'Nutritional Health',
  'Vitamin B12': 'Nutritional Health',
  'Folate': 'Nutritional Health',
  'Zinc': 'Nutritional Health',
  'Magnesium': 'Nutritional Health',
  'Calcium': 'Nutritional Health',
  'Phosphate': 'Nutritional Health',
  'Selenium': 'Nutritional Health',
  'Omega-3 Index': 'Nutritional Health',
  'CRP': 'Infection & Inflammation',
  'hsCRP': 'Infection & Inflammation',
  'ESR': 'Infection & Inflammation',
  'CK': 'Muscle & Joint Health',
  'Creatine Kinase': 'Muscle & Joint Health',
}

export function getMarkerCategory(markerName: string): MarkerCategory {
  // Exact match
  if (CATEGORY_MAP[markerName]) return CATEGORY_MAP[markerName]
  // Case-insensitive match
  const lower = markerName.toLowerCase()
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (key.toLowerCase() === lower) return cat
  }
  // Fallback
  return 'Full Blood Count'
}

export function isAutoAssignedCategory(markerName: string): boolean {
  return !CATEGORY_MAP[markerName] &&
    !Object.keys(CATEGORY_MAP).some(k => k.toLowerCase() === markerName.toLowerCase())
}

export const ALL_CATEGORIES: MarkerCategory[] = [
  'Results of Interest',
  'Full Blood Count',
  'Iron Status',
  'Heart Health',
  'Diabetes Health',
  'Metabolic Syndrome',
  'Kidney Health',
  'Liver Health',
  'Nutritional Health',
  'Muscle & Joint Health',
  'Bone Health',
  'Infection & Inflammation',
  'Pituitary & Adrenal Health',
  'Thyroid Health',
  'Stress Health',
  'Hormonal Health',
]
