// BROWSER SAFE — uses anon key, RLS enforced at DB level
import { createBrowserClient } from '@supabase/ssr'

// Module-level singleton — prevents multiple instances competing for the
// same Web Locks API auth token refresh lock (AbortError: Lock was stolen).
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClientSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
