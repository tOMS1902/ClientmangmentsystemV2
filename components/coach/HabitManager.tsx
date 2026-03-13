'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import type { Habit } from '@/lib/types'

interface HabitManagerProps {
  clientId: string
  initialHabits: Habit[]
}

export function HabitManager({ clientId, initialHabits }: HabitManagerProps) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, name, description, is_active: true }),
    })
    if (res.ok) {
      const habit = await res.json()
      setHabits([...habits, habit])
      setName('')
      setDescription('')
      setAdding(false)
    }
  }

  async function handleDelete(habitId: string) {
    const res = await fetch(`/api/habits?id=${habitId}`, { method: 'DELETE' })
    if (res.ok) {
      setHabits(habits.filter(h => h.id !== habitId))
    }
  }

  return (
    <div>
      <Eyebrow>Daily Habits</Eyebrow>
      <GoldRule />

      <div className="flex flex-col gap-2 mt-3">
        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center justify-between py-3 border-b border-white/8">
            <div>
              <p className="text-sm text-white">{habit.name}</p>
              {habit.description && <p className="text-xs text-grey-muted">{habit.description}</p>}
            </div>
            <button onClick={() => handleDelete(habit.id)} className="text-grey-muted hover:text-white p-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {habits.length === 0 && (
          <p className="text-grey-muted text-sm">No habits set. Add the first one below.</p>
        )}
      </div>

      {adding ? (
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Habit name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Drink 3L water" />
          <Input label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Track with a 1L bottle" />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleAdd}>Add Habit</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="mt-4" onClick={() => setAdding(true)}>
          + Add Habit
        </Button>
      )}
    </div>
  )
}
