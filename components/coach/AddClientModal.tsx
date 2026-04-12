'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function AddClientModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipOnboarding, setSkipOnboarding] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      full_name: fd.get('full_name'),
      phone: fd.get('phone'),
      start_date: fd.get('start_date'),
      start_weight: parseFloat(fd.get('start_weight') as string),
      current_weight: parseFloat(fd.get('start_weight') as string),
      goal_weight: parseFloat(fd.get('goal_weight') as string),
      goal_text: fd.get('goal_text'),
      check_in_day: fd.get('check_in_day'),
      is_active: true,
      portal_access: false,
      skip_onboarding: skipOnboarding,
    }
    if (!skipOnboarding) {
      body.email = fd.get('email')
      body.password = fd.get('password')
    } else {
      body.email = fd.get('email') || null
    }
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create client')
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Client</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-navy-mid border border-white/12 w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <h2
                className="text-xl text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                New Client
              </h2>
              <button onClick={() => setOpen(false)} className="text-grey-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-4">

              {/* Onboarding toggle */}
              <div className="flex items-center gap-3 p-3 border border-white/10 bg-navy-card">
                <button
                  type="button"
                  onClick={() => setSkipOnboarding(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${skipOnboarding ? 'bg-gold' : 'bg-white/20'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${skipOnboarding ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <p className="text-sm text-white/85">Skip onboarding / no portal access</p>
                  <p className="text-xs text-grey-muted">Add manually using previous data. Portal can be enabled later.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" name="full_name" required placeholder="Jane Smith" />
                <Input
                  label={skipOnboarding ? 'Email (optional)' : 'Email'}
                  name="email"
                  type="email"
                  required={!skipOnboarding}
                  placeholder="jane@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" name="phone" placeholder="+353 87 000 0000" />
                <Input label="Start Date" name="start_date" type="date" required defaultValue={today} />
              </div>

              {!skipOnboarding && (
                <Input label="Password" name="password" type="password" required placeholder="Set a login password" />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Weight (kg)" name="start_weight" type="number" step="0.1" required placeholder="80" />
                <Input label="Goal Weight (kg)" name="goal_weight" type="number" step="0.1" required placeholder="72" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-white/85 font-body">Check-in Day</label>
                <select
                  name="check_in_day"
                  defaultValue="Monday"
                  className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-white/85 font-body">Goal</label>
                <textarea
                  name="goal_text"
                  rows={2}
                  placeholder="Client's primary goal..."
                  className="bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating…' : 'Create Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
