// SERVER ONLY — never import this in client components
import { createServerSupabaseClient } from './server'

export async function getLastWeightsForClient(
  clientId: string
): Promise<Record<string, number | null>> {
  const supabase = await createServerSupabaseClient()

  // Single query — fetch all entries for the client ordered by most recent first.
  // We deduplicate in JS to get the latest weight per exercise_id.
  const { data } = await supabase
    .from('logbook_entries')
    .select('exercise_id, weight_kg, log_date')
    .eq('client_id', clientId)
    .order('log_date', { ascending: false })
    .order('set_number', { ascending: false })

  if (!data) return {}

  const result: Record<string, number | null> = {}
  for (const entry of data) {
    if (!(entry.exercise_id in result)) {
      result[entry.exercise_id] = entry.weight_kg
    }
  }
  return result
}

export async function logWeightEntry(entry: {
  client_id: string
  exercise_id: string
  weight_kg: number
  reps_completed: number
  set_number: number
  log_date: string
}): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase
    .from('logbook_entries')
    .upsert(entry, { onConflict: 'client_id,exercise_id,log_date,set_number' })
}
