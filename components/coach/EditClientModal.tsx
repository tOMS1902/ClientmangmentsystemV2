'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Client } from '@/lib/types'
import type { WeightUnit } from '@/lib/units'

interface EditClientModalProps {
  client: Client
}

export function EditClientModal({ client }: EditClientModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(client.full_name)
  const [phone, setPhone] = useState(client.phone || '')
  const [region, setRegion] = useState<'EU' | 'US'>(client.region ?? 'EU')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(client.weight_unit ?? 'kg')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        phone: phone || undefined,
        region,
        weight_unit: weightUnit,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
      setLoading(false)
      return
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-grey-muted hover:text-white transition-colors border border-white/20 px-3 py-1.5 hover:border-white/50"
        style={{ fontFamily: 'var(--font-label)' }}
      >
        <Pencil size={12} />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />

          <div className="relative bg-navy-mid border border-white/12 w-full max-w-md z-10">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <h2 className="text-xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Edit Client
              </h2>
              <button onClick={() => setOpen(false)} className="text-grey-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />

              <Input
                label="Phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+353 87 000 0000"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-white/85 font-body">Region</label>
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value as 'EU' | 'US')}
                    className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
                  >
                    <option value="EU">🇪🇺 EU</option>
                    <option value="US">🇺🇸 US</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-white/85 font-body">Weight Unit</label>
                  <div className="flex">
                    {(['kg', 'lbs'] as WeightUnit[]).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setWeightUnit(u)}
                        className={`flex-1 py-2.5 text-sm border transition-colors ${weightUnit === u ? 'border-gold text-gold bg-gold/10' : 'border-white/20 text-white/50 hover:border-white/50'}`}
                        style={{ fontFamily: 'var(--font-label)' }}
                      >
                        {u.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
