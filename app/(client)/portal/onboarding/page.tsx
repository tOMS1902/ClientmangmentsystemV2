'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Input } from '@/components/ui/Input'

const questions = [
  { key: 'goal', label: 'What is your main goal?', type: 'select', options: ['Fat Loss', 'Muscle Gain', 'Body Recomposition', 'General Health'] },
  { key: 'current_weight', label: 'Current weight (kg)', type: 'number', placeholder: 'e.g. 80' },
  { key: 'goal_weight', label: 'Goal weight (kg)', type: 'number', placeholder: 'e.g. 72' },
  { key: 'height', label: 'Height (cm)', type: 'number', placeholder: 'e.g. 178' },
  { key: 'age', label: 'Age', type: 'number', placeholder: 'e.g. 35' },
  { key: 'activity_level', label: 'Activity level', type: 'select', options: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'] },
  { key: 'training_experience', label: 'Training experience', type: 'select', options: ['Beginner <1yr', 'Intermediate 1-3yrs', 'Advanced 3+yrs'] },
  { key: 'training_days', label: 'How many days per week can you train?', type: 'select', options: ['2', '3', '4', '5'] },
  { key: 'equipment', label: 'Equipment access', type: 'select', options: ['Full Gym', 'Home with Dumbbells', 'Bodyweight Only'] },
  { key: 'injuries', label: 'Any injuries or limitations?', type: 'textarea', placeholder: 'e.g. Lower back pain, or None' },
  { key: 'daily_schedule', label: 'Describe your typical daily schedule briefly', type: 'textarea', placeholder: 'e.g. Up at 6am, in office by 9, home by 7pm...' },
  { key: 'dietary_preferences', label: 'Dietary preferences or restrictions', type: 'textarea', placeholder: 'e.g. No restrictions, vegetarian, dislikes fish...' },
  { key: 'what_worked', label: "What has and hasn't worked for you before?", type: 'textarea', placeholder: 'e.g. Calorie counting worked until stress hit...' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const currentQuestion = questions[step]
  const isLast = step === questions.length - 1
  const progress = ((step + 1) / questions.length) * 100

  function handleNext() {
    if (!answers[currentQuestion.key]) return
    if (isLast) {
      handleSubmit()
    } else {
      setStep(s => s + 1)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: answers }),
    })
    if (res.ok) {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="text-4xl text-gold mb-4" style={{ fontFamily: 'var(--font-display)' }}>LE</div>
        <h2 className="text-2xl text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Thank you
        </h2>
        <p className="text-grey-muted text-sm">
          Your onboarding has been received. Your coach will review your profile and activate your access shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Eyebrow>Onboarding</Eyebrow>
        <p className="text-grey-muted text-sm mt-1">Step {step + 1} of {questions.length}</p>
        <div className="h-1 bg-navy-card mt-3">
          <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-navy-card border border-white/8 p-8">
        <h2 className="text-xl text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
          {currentQuestion.label}
        </h2>

        {currentQuestion.type === 'select' && (
          <div className="flex flex-col gap-2">
            {currentQuestion.options?.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.key]: opt }))}
                className={`text-left px-4 py-3 text-sm border transition-colors ${
                  answers[currentQuestion.key] === opt
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-white/20 text-white/85 hover:border-gold/50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'number' && (
          <Input
            type="number"
            value={answers[currentQuestion.key] || ''}
            onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.key]: e.target.value }))}
            placeholder={currentQuestion.placeholder}
          />
        )}

        {currentQuestion.type === 'textarea' && (
          <textarea
            value={answers[currentQuestion.key] || ''}
            onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.key]: e.target.value }))}
            placeholder={currentQuestion.placeholder}
            rows={4}
            className="w-full bg-navy-mid border border-white/20 text-white/85 p-3 text-sm focus:outline-none focus:border-gold resize-none"
          />
        )}

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={!answers[currentQuestion.key] || submitting}
          >
            {isLast ? (submitting ? 'Submitting...' : 'Submit') : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
