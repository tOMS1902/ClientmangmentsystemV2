'use client'

import { useState, useEffect } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { WeightUnit } from '@/lib/units'

export default function SettingsPage() {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/clients/me')
      .then(r => r.json())
      .then(data => {
        setWeightUnit(data.weight_unit === 'lbs' ? 'lbs' : 'kg')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleUnitChange(unit: WeightUnit) {
    setWeightUnit(unit)
    setSaving(true)
    setSaved(false)
    await fetch('/api/clients/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_unit: unit }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-grey-muted">Loading...</div>

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <Eyebrow>Settings</Eyebrow>
        <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          Preferences
        </h1>
        <GoldRule className="mt-3" />
      </div>

      <div className="bg-navy-card border border-white/8 p-6">
        <p className="text-white/85 text-sm mb-1">Weight unit</p>
        <p className="text-grey-muted text-xs mb-4">
          All weights — including your check-in history — will display in your chosen unit.
          Data is always stored in kg internally.
        </p>
        <div className="flex gap-3">
          {(['kg', 'lbs'] as WeightUnit[]).map(unit => (
            <button
              key={unit}
              type="button"
              onClick={() => handleUnitChange(unit)}
              className={`px-6 py-2.5 text-sm font-semibold border transition-colors ${
                weightUnit === unit
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white/85'
              }`}
              style={{ fontFamily: 'var(--font-label)' }}
            >
              {unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}
            </button>
          ))}
        </div>
        {saving && <p className="text-grey-muted text-xs mt-3">Saving...</p>}
        {saved && <p className="text-green-400 text-xs mt-3">Saved. All weight displays will update.</p>}
      </div>
    </div>
  )
}
