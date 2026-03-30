'use client'

import { useState } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'

interface Q {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea'
  options?: string[]
  placeholder?: string
  large?: boolean
  note?: string
}

const STEP_1: Q[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
  { key: 'activity_days', label: 'Current activity level — days/week', type: 'select', options: ['0 days', '1–2', '3–4', '5+'] },
  { key: 'training_experience', label: 'Experience with resistance training', type: 'select', options: ['Beginner <1yr', 'Intermediate 1–3yrs', 'Advanced 3+yrs'] },
  { key: 'training_days', label: 'Days per week available to train', type: 'select', options: ['2', '3', '4', '5', '6'] },
  { key: 'preferred_time', label: 'Preferred training time', type: 'select', options: ['Early morning', 'Morning', 'Lunchtime', 'Afternoon', 'Evening', 'Late evening'] },
  { key: 'preferred_style', label: 'Preferred training style', type: 'select', options: ['Strength', 'Hypertrophy', 'Athletic performance', 'Fat loss + conditioning', 'General fitness'] },
  { key: 'workout_structure', label: 'Preferred workout structure', type: 'select', options: ['Full body', 'Upper/Lower', 'Push/Pull/Legs', 'Body-part splits', 'No preference'] },
  { key: 'avoid_exercises', label: 'Exercises or equipment to avoid', type: 'textarea', placeholder: 'e.g. Barbell squats due to knee pain, or None' },
  { key: 'injuries', label: 'Injuries or physical limitations', type: 'textarea', placeholder: 'e.g. Lower back tightness from desk work, or None' },
  { key: 'priority_areas', label: 'Areas to prioritise', type: 'textarea', placeholder: 'e.g. Posterior chain, upper back, core strength' },
  { key: 'strength_goals', label: 'Specific strength goals', type: 'textarea', placeholder: 'e.g. 100kg deadlift, or general improvement' },
  { key: 'previous_programmes', label: 'Previous structured programmes', type: 'textarea', placeholder: 'Describe any programmes you have followed before' },
  { key: 'mobility_prehab', label: 'Include mobility/prehab work?', type: 'select', options: ['Yes – integrate', 'Yes – separate block', 'No'] },
]

const STEP_2: Q[] = [
  { key: 'weight_kg', label: 'Weight (kg)', type: 'number', placeholder: 'e.g. 80' },
  { key: 'age', label: 'Age', type: 'number', placeholder: 'e.g. 35' },
  { key: 'height', label: 'Height (ft/inch or cm)', type: 'text', placeholder: "e.g. 5'11\" or 180cm" },
  { key: 'daily_steps', label: 'Average daily steps', type: 'number', placeholder: 'e.g. 8000' },
  { key: 'primary_goals', label: 'Primary goals', type: 'multiselect', options: ['Fat loss', 'Muscle gain', 'Body recomposition', 'Performance', 'Energy & health', 'Maintain weight'] },
  { key: 'motivation', label: 'What motivates you most?', type: 'textarea', placeholder: 'What keeps you going or what are you working towards?' },
  { key: 'fat_loss_history', label: 'Past success with fat/weight loss', type: 'textarea', placeholder: "What has worked before, and what hasn't?" },
  { key: 'meals_per_day', label: 'Meals per day', type: 'select', options: ['1–2', '3', '4', '5+'] },
  { key: 'food_allergies', label: 'Known food allergies or intolerances', type: 'textarea', placeholder: 'e.g. Lactose intolerant, nut allergy, or None' },
  { key: 'foods_avoided', label: 'Foods you will not eat', type: 'textarea', placeholder: 'e.g. Shellfish, Brussels sprouts, or None' },
  { key: 'foods_wanted', label: 'Foods you want included', type: 'textarea', placeholder: 'e.g. High protein options, Greek yoghurt, rice' },
  { key: 'typical_eating', label: 'Describe a typical day of eating', type: 'textarea', placeholder: 'Walk through breakfast, lunch, dinner, snacks...', large: true },
  { key: 'meal_prep_time', label: 'Meal prep time available', type: 'select', options: ['Under 15 mins', 'Up to 30 mins', 'Batch cook', 'No constraints'] },
  { key: 'calorie_tracking', label: 'Calorie tracking', type: 'select', options: ['Yes consistently', 'Occasionally', 'Never', 'Used to but stopped'] },
  { key: 'training_fasted', label: 'Training time / fasted preference', type: 'textarea', placeholder: 'e.g. Train fasted in the morning, prefer not to eat before training' },
  { key: 'food_relationship', label: 'Relationship with food / eating disorders', type: 'textarea', placeholder: 'This is confidential and only visible to your coach', note: 'Confidential' },
  { key: 'medical_conditions', label: 'Medical conditions affecting diet', type: 'textarea', placeholder: 'e.g. Type 2 diabetes, IBS, or None' },
]

const STEP_3: Q[] = [
  { key: 'work_week', label: 'Typical work week', type: 'select', options: ['Office fixed hours', 'Office unpredictable', 'Remote/hybrid', 'Courtroom/on-site', 'Shift-based'] },
  { key: 'wake_time', label: 'Wake-up time', type: 'text', placeholder: 'e.g. 6:30am' },
  { key: 'work_start', label: 'Work start time', type: 'text', placeholder: 'e.g. 9:00am' },
  { key: 'work_finish', label: 'Work finish time', type: 'text', placeholder: 'e.g. 6:00pm' },
  { key: 'bedtime', label: 'Bedtime', type: 'text', placeholder: 'e.g. 11:00pm' },
  { key: 'peak_energy', label: 'Peak energy window', type: 'select', options: ['Early morning', 'Morning', 'Midday', 'Afternoon', 'Evening'] },
  { key: 'energy_crash', label: 'When does energy crash?', type: 'text', placeholder: 'e.g. 3–4pm after lunch' },
  { key: 'stress_triggers', label: 'Biggest stress triggers', type: 'textarea', placeholder: 'e.g. Court deadlines, client demands, family pressure' },
  { key: 'stress_response', label: 'How do you respond to stress?', type: 'multiselect', options: ['Skip training', 'Eat more/less', 'Poor sleep', 'Increase alcohol', 'Push through', 'Exercise to decompress'] },
  { key: 'wearable', label: 'Wearable / HRV tracking', type: 'select', options: ['Whoop', 'Oura', 'Apple/Garmin', 'None'] },
  { key: 'sleep_hours', label: 'Average sleep hours', type: 'select', options: ['<5', '5–6', '6–7', '7–8', '8+'] },
  { key: 'phone_in_bed', label: 'Phone in bed?', type: 'select', options: ['Yes always', 'Sometimes', 'Rarely', 'Never'] },
  { key: 'weekends_routine', label: 'Weekends derail routine?', type: 'select', options: ['Yes consistently', 'Sometimes', 'Rarely', 'No – structured'] },
  { key: 'alcohol_frequency', label: 'Alcohol frequency per week', type: 'select', options: ['None', '1–2 occasionally', '3–7/week', '8–14/week', '14+'] },
  { key: 'work_travel', label: 'Regular work travel?', type: 'select', options: ['No', 'Occasionally', 'Frequently', 'Constant'] },
]

const STEPS = [
  { title: 'Training', subtitle: 'Functional Strength Framework', questions: STEP_1 },
  { title: 'Nutrition', subtitle: 'Tailored Nutrition Plan', questions: STEP_2 },
  { title: 'Lifestyle', subtitle: 'Client Integration Form', questions: STEP_3 },
]

function toggleMulti(current: string, value: string): string {
  const arr = current ? current.split(',').filter(Boolean) : []
  return arr.includes(value) ? arr.filter(v => v !== value).join(',') : [...arr, value].join(',')
}

function isStepComplete(questions: Q[], answers: Record<string, string>): boolean {
  return questions.every(q => {
    const val = answers[q.key]
    if (!val || !val.trim()) return false
    if (q.type === 'multiselect') return val.split(',').filter(Boolean).length > 0
    return true
  })
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const canAdvance = isStepComplete(current.questions, answers)

  function set(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: answers }),
    })
    if (res.ok) setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="text-4xl text-gold mb-4" style={{ fontFamily: 'var(--font-display)' }}>LE</div>
        <h2 className="text-2xl text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Thank you</h2>
        <p className="text-grey-muted text-sm leading-relaxed">
          Your onboarding has been received. Your coach will review your profile and activate your access shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      {/* Step indicator */}
      <div className="mb-8">
        <Eyebrow>Client Intake</Eyebrow>
        <GoldRule className="mt-2" />
        <div className="flex items-center gap-3 mt-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${i === step ? 'text-gold' : i < step ? 'text-white/50' : 'text-white/20'}`}>
                <span className={`w-6 h-6 rounded-full border text-xs flex items-center justify-center ${i === step ? 'border-gold bg-gold/10' : i < step ? 'border-white/30 bg-white/5' : 'border-white/20'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="text-xs hidden sm:block" style={{ fontFamily: 'var(--font-label)' }}>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && <span className="text-white/20 text-xs">—</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)' }}>{current.title}</h2>
        <p className="text-grey-muted text-sm mt-1">{current.subtitle}</p>
      </div>

      <div className="flex flex-col gap-5">
        {current.questions.map(q => (
          <div key={q.key}>
            <label className="block text-white/85 text-sm mb-2 font-medium">
              {q.label}
              {q.note && <span className="ml-2 text-xs text-gold/70" style={{ fontFamily: 'var(--font-label)' }}>{q.note.toUpperCase()}</span>}
            </label>

            {(q.type === 'text' || q.type === 'number') && (
              <input
                type={q.type}
                value={answers[q.key] || ''}
                onChange={e => set(q.key, e.target.value)}
                placeholder={q.placeholder}
                className="w-full bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            )}

            {q.type === 'select' && (
              <div className="flex flex-col gap-2">
                {q.options?.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set(q.key, opt)}
                    className={`text-left px-4 py-3 text-sm border transition-colors ${
                      answers[q.key] === opt
                        ? 'border-gold text-gold bg-gold/5'
                        : 'border-white/20 text-white/85 hover:border-gold/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'multiselect' && (
              <div className="flex flex-wrap gap-2">
                {q.options?.map(opt => {
                  const selected = (answers[q.key] || '').split(',').includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(q.key, toggleMulti(answers[q.key] || '', opt))}
                      className={`px-3 py-2 text-sm border transition-colors ${
                        selected
                          ? 'border-gold text-gold bg-gold/5'
                          : 'border-white/20 text-white/85 hover:border-gold/50'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {q.type === 'textarea' && (
              <textarea
                value={answers[q.key] || ''}
                onChange={e => set(q.key, e.target.value)}
                placeholder={q.placeholder}
                rows={q.large ? 6 : 3}
                className="w-full bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8 pb-8">
        {step > 0 && (
          <Button variant="ghost" size="md" onClick={() => setStep(s => s - 1)}>
            ← Back
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={isLast ? handleSubmit : () => setStep(s => s + 1)}
          disabled={!canAdvance || submitting}
        >
          {isLast ? (submitting ? 'Submitting...' : 'Submit') : 'Next →'}
        </Button>
      </div>
    </div>
  )
}
