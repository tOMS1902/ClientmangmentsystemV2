import type { MarkerStatus } from '@/lib/types'

/**
 * Classifies a marker value against its reference range.
 * Uses an 8% buffer to create borderline zones either side of the range.
 */
export function classifyMarker(
  value: number,
  refLow: number,
  refHigh: number
): MarkerStatus {
  // Edge case: no real range
  if (refLow === refHigh) return 'optimal'

  const range = refHigh - refLow
  const buffer = range * 0.08

  if (value < refLow - buffer) return 'low'
  if (value > refHigh + buffer) return 'high'
  if (value < refLow) return 'borderline-low'
  if (value > refHigh) return 'borderline-high'
  return 'optimal'
}

export function isFlagged(status: MarkerStatus): boolean {
  return status !== 'optimal'
}

/**
 * Recalculates health score: (optimal markers / total markers) × 100
 */
export function calculateHealthScore(markers: { status: MarkerStatus }[]): number {
  if (markers.length === 0) return 0
  const optimal = markers.filter(m => m.status === 'optimal').length
  return Math.round((optimal / markers.length) * 100)
}
