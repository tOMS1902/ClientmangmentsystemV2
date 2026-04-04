import type { SupabaseClient } from '@supabase/supabase-js'

export async function buildClientContext(clientId: string, supabase: SupabaseClient): Promise<string> {
  const [
    { data: client },
    { data: checkins },
    { data: midweekChecks },
    { data: targets },
    { data: onboarding },
    { data: programmes },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('check_in_date', { ascending: false }).limit(6),
    supabase.from('midweek_checks').select('*').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(3),
    supabase.from('nutrition_targets').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('onboarding_responses').select('responses').eq('client_id', clientId).maybeSingle(),
    supabase.from('programmes').select('name, created_at').eq('client_id', clientId).eq('is_active', true),
  ])

  if (!client) return 'No client data found.'

  const latestCheckin = checkins?.[0] ?? null
  const prevCheckin = checkins?.[1] ?? null
  const r = (onboarding?.responses ?? {}) as Record<string, string>

  const weekNumber = Math.max(1, Math.ceil((Date.now() - new Date(client.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)))

  const lines: string[] = [
    `CLIENT: ${client.full_name}`,
    `Started: ${client.start_date} | Week ${weekNumber}`,
    `Current weight: ${latestCheckin?.weight ?? client.current_weight ?? '?'}kg | Goal: ${client.goal_weight}kg | Start: ${client.start_weight}kg`,
    `Goal: ${client.goal_text || 'Not specified'}`,
  ]

  if (targets) {
    lines.push(`Nutrition targets: ${targets.td_calories}kcal / ${targets.td_protein}g protein (training), ${targets.ntd_calories}kcal / ${targets.ntd_protein}g protein (rest)`)
    lines.push(`Daily steps target: ${targets.daily_steps} | Sleep target: ${targets.sleep_target_hours}h`)
  }

  if (programmes?.length) {
    lines.push(`Active programme(s): ${programmes.map((p: { name: string }) => p.name).join(', ')}`)
  }

  if (r.primary_goals) lines.push(`Goals: ${r.primary_goals}`)
  if (r.training_experience) lines.push(`Experience: ${r.training_experience}`)
  if (r.injuries) lines.push(`Injuries/limitations: ${r.injuries}`)
  if (r.food_allergies) lines.push(`Food allergies: ${r.food_allergies}`)

  lines.push('')
  lines.push('RECENT CHECK-INS (newest first):')

  if (!checkins?.length) {
    lines.push('No check-ins yet.')
  } else {
    for (let i = 0; i < checkins.length; i++) {
      const c = checkins[i]
      const prev = checkins[i + 1] ?? null
      const weightDelta = i === 0 && prev
        ? ` (${(c.weight - prev.weight) >= 0 ? '+' : ''}${(c.weight - prev.weight).toFixed(1)}kg vs prev)`
        : ''
      lines.push(`  Week ${c.week_number} (${c.check_in_date}): weight ${c.weight}kg${weightDelta}, score ${c.week_score ?? '?'}/10, energy ${c.energy_score ?? c.energy_summary ?? '?'}, diet: ${c.diet_rating ?? c.diet_summary ?? '?'}, training: ${c.training_completed ?? c.training_sessions ?? '?'}`)
      if (c.biggest_win) lines.push(`    Win: "${c.biggest_win}"`)
      if (c.main_challenge) lines.push(`    Challenge: "${c.main_challenge}"`)
    }
    // suppress unused variable warning
    void prevCheckin
  }

  if (midweekChecks?.length) {
    lines.push('')
    lines.push('RECENT MIDWEEK CHECKS:')
    for (const m of midweekChecks) {
      lines.push(`  Week ${m.week_number}: training ${m.training_on_track}, food ${m.food_on_track}, energy ${m.energy_level}/5${m.biggest_blocker ? `, blocker: "${m.biggest_blocker}"` : ''}`)
    }
  }

  return lines.join('\n')
}
