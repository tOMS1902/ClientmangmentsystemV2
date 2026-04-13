export const MARKER_EXPLANATIONS: Record<string, string> = {
  'Cortisol': 'Elevated cortisol indicates chronic stress load. Key driver of sleep disruption, fat storage, and testosterone suppression.',
  'DHEA-S': 'An adrenal hormone that counterbalances cortisol. Low levels combined with high cortisol indicate adrenal fatigue pattern.',
  'Testosterone (total)': 'Low-normal testosterone is commonly driven by elevated cortisol and poor sleep — not always a standalone issue.',
  'SHBG': 'Sex hormone binding globulin. High SHBG reduces free (active) testosterone even when total is normal.',
  'Free Androgen Index': 'A ratio that estimates how much active testosterone is available for the body to use.',
  'FAI': 'A ratio that estimates how much active testosterone is available for the body to use.',
  'Fasting Glucose': 'Borderline elevated fasting glucose signals early insulin resistance. Directly addressable through diet, sleep, and stress management.',
  'HbA1c': 'Reflects average blood sugar over the past 3 months. Trending up indicates developing metabolic stress.',
  'Fasting Insulin': 'A more sensitive marker of insulin resistance than glucose alone. Elevated even before glucose rises.',
  'Vitamin D': 'Borderline insufficient — extremely common in Ireland. Low Vitamin D affects immunity, mood, hormonal function, and recovery.',
  'Ferritin': 'Iron storage marker. Low ferritin impacts energy, recovery, and cognitive performance. Increase dietary iron and monitor.',
  'TSH': 'Primary thyroid screening marker. Outside range suggests thyroid dysfunction — either underactive or overactive.',
  'Free T3': 'The active form of thyroid hormone. Low Free T3 can cause fatigue and slow metabolism even when TSH is normal.',
  'Total Cholesterol': 'Overall cholesterol level. Context matters — assess alongside HDL, LDL, and triglyceride ratio.',
  'LDL': "Low-density lipoprotein. Elevated LDL is a cardiovascular risk marker. Review particle size and HDL ratio for full picture.",
  'HDL': "High-density lipoprotein ('good' cholesterol). Low HDL increases cardiovascular risk independent of total cholesterol.",
  'Triglycerides': 'Elevated triglycerides are a metabolic dysfunction marker, commonly driven by refined carbohydrates and alcohol intake.',
  'hsCRP': 'High-sensitivity CRP measures systemic inflammation. Elevated levels indicate the body is under ongoing inflammatory load.',
  'ALT': 'Liver enzyme. Elevated ALT indicates liver stress — commonly from alcohol, dietary fat load, or training overload.',
  'Creatinine': 'Kidney filtration marker. Elevated creatinine may indicate reduced kidney function — context with eGFR required.',
  'eGFR': 'Estimated glomerular filtration rate — a direct measure of how well the kidneys are filtering blood.',
  'Vitamin B12': 'Essential for energy, nerve function, and red blood cell production. Low B12 can cause fatigue and cognitive impairment.',
  'B12': 'Essential for energy, nerve function, and red blood cell production. Low B12 can cause fatigue and cognitive impairment.',
  'Folate': 'B vitamin critical for cell function and DNA repair. Low folate often co-occurs with low B12.',
}

export function getMarkerExplanation(markerName: string): string {
  return MARKER_EXPLANATIONS[markerName] ||
    MARKER_EXPLANATIONS[Object.keys(MARKER_EXPLANATIONS).find(k => k.toLowerCase() === markerName.toLowerCase()) ?? ''] ||
    ''
}
