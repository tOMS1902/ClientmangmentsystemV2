// BROWSER SAFE — uses anon key, RLS enforced at DB level
import { createBrowserClient } from '@supabase/ssr'

export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
