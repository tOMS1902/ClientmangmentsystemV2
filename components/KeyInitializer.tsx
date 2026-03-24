'use client'

import { useKeyInit } from '@/hooks/useKeyInit'

// Drop this into any layout to ensure encryption keys are generated and uploaded
// as soon as the user lands on any page after sign-in.
export function KeyInitializer() {
  useKeyInit()
  return null
}
