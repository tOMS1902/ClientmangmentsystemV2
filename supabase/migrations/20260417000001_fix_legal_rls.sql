-- =============================================================================
-- SECURITY FIX: Scope coaches_read_legal_submissions to own clients only
-- Previously any coach could read all coaches' clients' legal submissions.
-- legal_onboarding_submissions.client_id = profiles.id (the client's user id)
-- Link to coach: clients.user_id = client_id AND clients.coach_id = auth.uid()
-- =============================================================================

-- =============================================================================
-- COMPANION FIX: Allow coaches to read their clients' profiles
-- Required now that server.ts uses anon key (RLS-enforced).
-- Without this, routes that read profiles for client users would return empty.
-- =============================================================================
DROP POLICY IF EXISTS "coach_read_client_profiles" ON profiles;

CREATE POLICY "coach_read_client_profiles"
  ON profiles FOR SELECT
  USING (
    -- Own profile (always readable)
    id = auth.uid()
    OR
    -- Client profiles: readable by their assigned coach
    EXISTS (
      SELECT 1
      FROM clients c
      JOIN profiles coach ON coach.id = auth.uid()
      WHERE coach.role = 'coach'
        AND c.coach_id = auth.uid()
        AND c.user_id = profiles.id
    )
  );

-- =============================================================================
-- SECURITY FIX: Scope coaches_read_legal_submissions to own clients only
-- =============================================================================
DROP POLICY IF EXISTS "coaches_read_legal_submissions" ON legal_onboarding_submissions;

CREATE POLICY "coaches_read_own_clients_legal_submissions"
  ON legal_onboarding_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN clients c ON c.coach_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'coach'
        AND c.user_id = legal_onboarding_submissions.client_id
    )
  );
