'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { NutritionTargets } from '@/lib/types'

interface NutritionTargetsFormProps {
  clientId: string
  initialTargets: NutritionTargets | null
}

export function NutritionTargetsForm({ clientId, initialTargets }: NutritionTargetsFormProps) {
  const [targets, setTargets] = useState({
    td_calories: initialTargets?.td_calories?.toString() || '',
    td_protein: initialTargets?.td_protein?.toString() || '',
    td_carbs: initialTargets?.td_carbs?.toString() || '',
    td_fat: initialTargets?.td_fat?.toString() || '',
    ntd_calories: initialTargets?.ntd_calories?.toString() || '',
    ntd_protein: initialTargets?.ntd_protein?.toString() || '',
    ntd_carbs: initialTargets?.ntd_carbs?.toString() || '',
    ntd_fat: initialTargets?.ntd_fat?.toString() || '',
    daily_steps: initialTargets?.daily_steps?.toString() || '',
    sleep_target_hours: initialTargets?.sleep_target_hours?.toString() || '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(field: string, value: string) {
    setTargets(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/nutrition-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          td_calories: parseInt(targets.td_calories),
          td_protein: parseInt(targets.td_protein),
          td_carbs: parseInt(targets.td_carbs),
          td_fat: parseInt(targets.td_fat),
          ntd_calories: parseInt(targets.ntd_calories),
          ntd_protein: parseInt(targets.ntd_protein),
          ntd_carbs: parseInt(targets.ntd_carbs),
          ntd_fat: parseInt(targets.ntd_fat),
          daily_steps: parseInt(targets.daily_steps),
          sleep_target_hours: parseFloat(targets.sleep_target_hours),
        }),
      })
      if (res.ok) {
        setMessage('Targets saved.')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch {
      setMessage('Error saving targets.')
    }
    setSaving(false)
  }

  return (
    <div>
      <Eyebrow className="mb-4">Nutrition Targets</Eyebrow>
      <GoldRule />

      <div className="grid grid-cols-2 gap-8 mt-4">
        <div>
          <p className="text-sm text-white/85 mb-3">Training Day</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calories" type="number" value={targets.td_calories} onChange={e => handleChange('td_calories', e.target.value)} />
            <Input label="Protein (g)" type="number" value={targets.td_protein} onChange={e => handleChange('td_protein', e.target.value)} />
            <Input label="Carbs (g)" type="number" value={targets.td_carbs} onChange={e => handleChange('td_carbs', e.target.value)} />
            <Input label="Fat (g)" type="number" value={targets.td_fat} onChange={e => handleChange('td_fat', e.target.value)} />
          </div>
        </div>
        <div>
          <p className="text-sm text-white/85 mb-3">Rest Day</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calories" type="number" value={targets.ntd_calories} onChange={e => handleChange('ntd_calories', e.target.value)} />
            <Input label="Protein (g)" type="number" value={targets.ntd_protein} onChange={e => handleChange('ntd_protein', e.target.value)} />
            <Input label="Carbs (g)" type="number" value={targets.ntd_carbs} onChange={e => handleChange('ntd_carbs', e.target.value)} />
            <Input label="Fat (g)" type="number" value={targets.ntd_fat} onChange={e => handleChange('ntd_fat', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Input label="Daily Steps" type="number" value={targets.daily_steps} onChange={e => handleChange('daily_steps', e.target.value)} />
        <Input label="Sleep Target (hrs)" type="number" step="0.5" value={targets.sleep_target_hours} onChange={e => handleChange('sleep_target_hours', e.target.value)} />
      </div>

      {initialTargets?.updated_at && (
        <p className="text-xs text-grey-muted mt-3">
          Last updated: {new Date(initialTargets.updated_at).toLocaleDateString('en-IE')}
        </p>
      )}

      {message && <p className="text-gold text-sm mt-2">{message}</p>}

      <Button variant="primary" size="md" onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save Targets'}
      </Button>
    </div>
  )
}
