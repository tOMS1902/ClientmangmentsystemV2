'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { SessionLogger } from '@/components/client/SessionLogger'
import type { Programme, ProgrammeDay } from '@/lib/types'

export default function ProgrammePage() {
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<ProgrammeDay | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const clientRes = await fetch('/api/clients/me')
        if (clientRes.ok) {
          const client = await clientRes.json()
          const progRes = await fetch(`/api/programme/${client.id}`)
          if (progRes.ok) {
            const data = await progRes.json()
            setProgrammes(Array.isArray(data) ? data : (data ? [data] : []))
          }
        }
      } catch {
        // no programme
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-grey-muted">Loading programme...</div>

  if (activeSession) {
    return (
      <div>
        <button
          onClick={() => setActiveSession(null)}
          className="text-grey-muted text-sm mb-6 flex items-center gap-2"
        >
          ← Back to programme
        </button>
        <SessionLogger day={activeSession} onComplete={() => setActiveSession(null)} />
      </div>
    )
  }

  if (programmes.length === 0) {
    return (
      <div>
        <Eyebrow>Training Programme</Eyebrow>
        <GoldRule />
        <p className="text-grey-muted mt-4">No programme set yet. Your coach will assign one shortly.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Eyebrow>Training Programme</Eyebrow>
        <GoldRule className="mt-2" />
      </div>

      {programmes.map(programme => (
        <div key={programme.id} className="mb-10">
          <h2 className="text-xl text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            {programme.name}
          </h2>

          <div className="flex flex-col gap-3">
            {programme.days.map(day => (
              <div key={day.id} className="border border-white/8">
                <div
                  className="flex items-center justify-between p-4 bg-navy-card cursor-pointer"
                  onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedDay === day.id
                      ? <ChevronDown size={16} className="text-grey-muted" />
                      : <ChevronRight size={16} className="text-grey-muted" />}
                    <span className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-label)' }}>
                      {day.day_label}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => { e.stopPropagation(); setActiveSession(day) }}
                  >
                    Start Session
                  </Button>
                </div>

                {expandedDay === day.id && (
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-grey-muted border-b border-white/8">
                          <th className="text-left py-2 font-normal">Exercise</th>
                          <th className="text-left py-2 font-normal w-16">Sets</th>
                          <th className="text-left py-2 font-normal w-20">Reps</th>
                          <th className="text-left py-2 font-normal w-20">Rest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.exercises.map(ex => (
                          <tr key={ex.id} className="border-b border-white/8">
                            <td className="py-2.5">
                              <div>
                                <p className="text-white">{ex.name}</p>
                                {ex.notes && <p className="text-xs text-grey-muted">{ex.notes}</p>}
                              </div>
                            </td>
                            <td className="py-2.5 text-white/85">{ex.sets}</td>
                            <td className="py-2.5 text-white/85">{ex.reps}</td>
                            <td className="py-2.5 text-white/85">{ex.rest_seconds ? `${ex.rest_seconds}s` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
