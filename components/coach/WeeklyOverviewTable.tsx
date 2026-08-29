'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { getWeekMonday, formatWeekRange } from '@/lib/planner'

interface OverviewRow {
  client_id: string
  client_name: string
  plan_id: string
  status: string
  week_number: number
  training_pct: number | null
  steps_pct: number | null
  nutrition_pct: number | null
  overall_pct: number | null
  total_items: number
  completed_items: number
}

type SortKey = 'client_name' | 'training_pct' | 'steps_pct' | 'nutrition_pct' | 'overall_pct' | 'status'

function pctColor(pct: number | null): string {
  if (pct == null) return 'text-white/20'
  if (pct >= 80) return 'text-green-400'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function pctDisplay(pct: number | null): string {
  if (pct == null) return '—'
  return `${pct}%`
}

export function WeeklyOverviewTable() {
  const [rows, setRows] = useState<OverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('client_name')
  const [sortAsc, setSortAsc] = useState(true)

  const weekStart = getWeekMonday()

  useEffect(() => {
    fetch(`/api/weekly-plans/overview?week_start=${weekStart}`)
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .finally(() => setLoading(false))
  }, [weekStart])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(prev => !prev)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return sortAsc ? cmp : -cmp
  })

  if (loading) {
    return (
      <div className="bg-navy-card border border-white/8 p-6">
        <p className="text-sm text-white/40">Loading weekly overview...</p>
      </div>
    )
  }

  if (rows.length === 0) return null

  const columns: { key: SortKey; label: string }[] = [
    { key: 'client_name', label: 'Client' },
    { key: 'training_pct', label: 'Training' },
    { key: 'steps_pct', label: 'Steps' },
    { key: 'nutrition_pct', label: 'Nutrition' },
    { key: 'overall_pct', label: 'Overall' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div>
      <Eyebrow>Weekly Planner Overview</Eyebrow>
      <p className="text-xs text-white/30 mb-1">{formatWeekRange(weekStart)}</p>
      <GoldRule className="mb-0" />
      <div className="bg-navy-card border border-white/8 overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-white/8">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left py-3 px-4 text-grey-muted font-normal cursor-pointer hover:text-white/60 select-none"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-gold">{sortAsc ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.client_id} className="border-b border-white/6 hover:bg-white/[0.02]">
                <td className="py-2.5 px-4">
                  <Link
                    href={`/clients/${row.client_id}`}
                    className="text-white/85 hover:text-gold transition-colors"
                  >
                    {row.client_name}
                  </Link>
                </td>
                <td className={`py-2.5 px-4 ${pctColor(row.training_pct)}`}>
                  {pctDisplay(row.training_pct)}
                </td>
                <td className={`py-2.5 px-4 ${pctColor(row.steps_pct)}`}>
                  {pctDisplay(row.steps_pct)}
                </td>
                <td className={`py-2.5 px-4 ${pctColor(row.nutrition_pct)}`}>
                  {pctDisplay(row.nutrition_pct)}
                </td>
                <td className={`py-2.5 px-4 font-semibold ${pctColor(row.overall_pct)}`}>
                  {pctDisplay(row.overall_pct)}
                </td>
                <td className="py-2.5 px-4">
                  <span className={`text-xs px-1.5 py-0.5 border ${
                    row.status === 'published' ? 'border-green-500/30 text-green-400' :
                    row.status === 'completed' ? 'border-gold/30 text-gold' :
                    'border-white/10 text-white/40'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
