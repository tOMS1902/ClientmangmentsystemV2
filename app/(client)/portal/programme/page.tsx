'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, History } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { Button } from '@/components/ui/Button'
import { SessionLogger } from '@/components/client/SessionLogger'
import type { Programme, ProgrammeDay, SessionLog } from '@/lib/types'

export default function ProgrammePage() {
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<ProgrammeDay | null>(null)
  const [activeSessionLastLog, setActiveSessionLastLog] = useState<SessionLog | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const clientRes = await fetch('/api/clients/me')
        if (!clientRes.ok) return
        const client = await clientRes.json()

        const [progRes, logsRes] = await Promise.all([
          fetch(`/api/programme/${client.id}`),
          fetch(`/api/session-logs/${client.id}`),
        ])

        if (progRes.ok) {
          const data = await progRes.json()
          setProgrammes(Array.isArray(data) ? data : (data ? [data] : []))
        }
        if (logsRes.ok) {
          const data = await logsRes.json()
          setSessionLogs(Array.isArray(data) ? data : [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
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
        <SessionLogger day={activeSession} lastSession={activeSessionLastLog} onComplete={() => { setActiveSession(null); setActiveSessionLastLog(null) }} />
      </div>
    )
  }

  if (showHistory) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Eyebrow>Session History</Eyebrow>
            <GoldRule className="mt-2" />
          </div>
          <button
            onClick={() => setShowHistory(false)}
            className="text-grey-muted text-sm hover:text-white transition-colors"
          >
            ← Back to plan
          </button>
        </div>

        {sessionLogs.length === 0 ? (
          <p className="text-grey-muted text-sm">No sessions logged yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessionLogs.map(log => (
              <div key={log.id} className="border border-white/8">
                <div
                  className="flex items-center justify-between p-4 bg-navy-card cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedLog === log.id
                      ? <ChevronDown size={16} className="text-grey-muted" />
                      : <ChevronRight size={16} className="text-grey-muted" />}
                    <div>
                      <p className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-label)' }}>
                        {log.day_label}
                      </p>
                      <p className="text-grey-muted text-xs mt-0.5">
                        {new Date(log.log_date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-grey-muted">{log.exercises_logged.length} exercises</span>
                </div>

                {expandedLog === log.id && (
                  <div className="p-4 flex flex-col gap-4">
                    {log.exercises_logged.map((entry, i) => (
                      <div key={i}>
                        <p className="text-white text-sm font-semibold mb-2">{entry.exercise_name}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs text-grey-muted mb-1">
                          <span>Set</span>
                          <span>Weight</span>
                          <span>Reps</span>
                        </div>
                        {entry.sets.map((set, j) => (
                          <div key={j} className="grid grid-cols-3 gap-2 text-sm py-1 border-b border-white/8">
                            <span className="text-grey-muted">{set.set_number}</span>
                            <span className="text-white">{set.weight_kg != null ? `${set.weight_kg}kg` : '—'}</span>
                            <span className="text-white">{set.reps_completed != null ? set.reps_completed : '—'}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Eyebrow>Training Programme</Eyebrow>
          <GoldRule className="mt-2" />
        </div>
        {sessionLogs.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 text-sm text-gold border border-gold/40 px-3 py-1.5 hover:border-gold transition-colors"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            <History size={14} />
            History ({sessionLogs.length})
          </button>
        )}
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
                    onClick={e => {
                      e.stopPropagation()
                      const lastLog = sessionLogs
                        .filter(l => l.programme_day_id === day.id)
                        .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())[0] ?? null
                      setActiveSessionLastLog(lastLog)
                      setActiveSession(day)
                    }}
                  >
                    Start Session
                  </Button>
                </div>

                {expandedDay === day.id && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[320px]">
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
                                <div className="flex items-center gap-2">
                                  <p className="text-white">{ex.name}</p>
                                  {ex.video_url && (
                                    <a
                                      href={ex.video_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gold text-xs underline underline-offset-2 hover:text-gold/80"
                                      style={{ fontFamily: 'var(--font-label)' }}
                                    >
                                      Watch
                                    </a>
                                  )}
                                </div>
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
