// SERVER ONLY — Admin client with service role key. Bypasses RLS.
// Use ONLY in:
//   - Cron jobs (no user session available)
//   - Storage signing/upload after application-layer auth has been verified
//   - Admin operations that cannot be done with a user-scoped client
// NEVER import in client components or expose to browsers.
import { createClient } from '@supabase/supabase-js'

export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
