'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { WeeklyPlanTemplate, WeeklyPlan } from '@/lib/types'

interface PlanTemplateModalProps {
  open: boolean
  onClose: () => void
  plan: WeeklyPlan | null
  onApply: (template: WeeklyPlanTemplate) => void
  onSaved: () => void
}

export function PlanTemplateModal({ open, onClose, plan, onApply, onSaved }: PlanTemplateModalProps) {
  const [templates, setTemplates] = useState<WeeklyPlanTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'list' | 'save'>('list')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/weekly-plan-templates')
      .then(r => r.ok ? r.json() : [])
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [open])

  async function handleSave() {
    if (!plan?.days || !saveName.trim()) return
    setSaving(true)

    const templateData = {
      days: (plan.days ?? []).map(d => ({
        day_of_week: d.day_of_week,
        day_type: d.day_type,
        nutrition_type: d.nutrition_type,
        step_target: d.step_target,
        notes: d.notes,
        items: (d.items ?? []).map(i => ({
          item_type: i.item_type,
          title: i.title,
          description: i.description,
          target: i.target,
          sort_order: i.sort_order,
        })),
      })),
    }

    await fetch('/api/weekly-plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName.trim(), template_data: templateData }),
    })

    setSaving(false)
    setSaveName('')
    setMode('list')
    onSaved()
    onClose()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/weekly-plan-templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-navy-card border border-white/10 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <h3 className="text-sm text-white" style={{ fontFamily: 'var(--font-label)' }}>
            {mode === 'save' ? 'Save as Template' : 'Plan Templates'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {mode === 'list' ? (
            <>
              {plan && (
                <button
                  onClick={() => setMode('save')}
                  className="w-full text-left p-3 border border-dashed border-gold/30 text-gold/60 hover:text-gold text-xs mb-3"
                >
                  + Save current plan as template
                </button>
              )}

              {loading ? (
                <p className="text-xs text-white/40 text-center py-4">Loading...</p>
              ) : templates.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">No templates saved yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {templates.map(t => (
                    <div key={t.id} className="border border-white/8 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/85">{t.name}</p>
                        {t.description && <p className="text-xs text-white/40">{t.description}</p>}
                        <p className="text-[10px] text-white/30 mt-1">
                          {t.template_data.days?.length ?? 0} days
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onApply(t)}
                          className="text-xs text-gold hover:text-gold/80"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-xs text-red-400/60 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Template name..."
                className="bg-navy-deep border border-white/20 text-white text-sm px-3 py-2 w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || !saveName.trim()} size="sm">
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
                <Button onClick={() => setMode('list')} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
