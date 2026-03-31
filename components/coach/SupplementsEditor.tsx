'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { Supplement } from '@/lib/types'

interface SupplementsEditorProps {
  clientId: string
  initialSupplements: Supplement[]
}

export function SupplementsEditor({ clientId, initialSupplements }: SupplementsEditorProps) {
  const [supplements, setSupplements] = useState<Supplement[]>(initialSupplements)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', dose: '', timing: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!form.name.trim() || !form.dose.trim() || !form.timing.trim()) {
      setError('Name, dose, and timing are required.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/supplements/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        dose: form.dose.trim(),
        timing: form.timing.trim(),
        notes: form.notes.trim() || null,
        sort_order: supplements.length,
      }),
    })
    if (res.ok) {
      const supplement = await res.json()
      setSupplements(prev => [...prev, supplement])
      setForm({ name: '', dose: '', timing: '', notes: '' })
      setAdding(false)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to add supplement.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/supplements/${clientId}?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSupplements(prev => prev.filter(s => s.id !== id))
    }
  }

  return (
    <div>
      <Eyebrow>Supplements</Eyebrow>
      <GoldRule />

      <div className="flex flex-col gap-0 mt-3">
        {supplements.length === 0 && !adding && (
          <p className="text-grey-muted text-sm">No supplements added yet.</p>
        )}
        {supplements.map(s => (
          <div key={s.id} className="flex items-start justify-between py-3 border-b border-white/8">
            <div>
              <p className="text-sm text-white">
                {s.name}
                <span className="text-grey-muted ml-2 font-normal">{s.dose}</span>
              </p>
              <p className="text-xs text-gold/80 mt-0.5">{s.timing}</p>
              {s.notes && <p className="text-xs text-grey-muted mt-0.5">{s.notes}</p>}
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              className="text-grey-muted hover:text-white p-1 ml-4 mt-0.5 flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Supplement name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Creatine"
            />
            <Input
              label="Dose"
              value={form.dose}
              onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
              placeholder="e.g. 5g"
            />
          </div>
          <Input
            label="When to take"
            value={form.timing}
            onChange={e => setForm(f => ({ ...f, timing: e.target.value }))}
            placeholder="e.g. Post-workout with meal, Morning with breakfast"
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Mix with water, cycle 8 weeks on / 4 weeks off"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding...' : 'Add Supplement'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setError('') }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="mt-4" onClick={() => setAdding(true)}>
          + Add Supplement
        </Button>
      )}
    </div>
  )
}
