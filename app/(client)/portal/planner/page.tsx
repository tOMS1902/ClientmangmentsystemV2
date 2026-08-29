'use client'

import { useState, useEffect } from 'react'
import { ClientPlannerView } from '@/components/client/planner/ClientPlannerView'
import type { NutritionTargets } from '@/lib/types'

export default function PlannerPage() {
  const [clientId, setClientId] = useState<string | null>(null)
  const [targets, setTargets] = useState<NutritionTargets | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/clients/me')
        if (!meRes.ok) return
        const client = await meRes.json()
        setClientId(client.id)

        const targetsRes = await fetch(`/api/nutrition-targets/${client.id}`)
        if (targetsRes.ok) {
          const t = await targetsRes.json()
          setTargets(t)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="text-grey-muted">Loading planner...</div>
  if (!clientId) return <div className="text-grey-muted">Unable to load your plan.</div>

  return <ClientPlannerView clientId={clientId} targets={targets} />
}
