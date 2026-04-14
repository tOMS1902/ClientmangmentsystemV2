-- Fix infinite recursion in legal_onboarding_submissions INSERT policy.
-- The original NOT EXISTS subquery queried the same table, causing Postgres
-- to re-evaluate the policy recursively. The UNIQUE constraint on client_id
-- already prevents duplicate submissions, so the subquery was redundant.
DROP POLICY IF EXISTS "clients_insert_own_legal_submission" ON legal_onboarding_submissions;

CREATE POLICY "clients_insert_own_legal_submission"
  ON legal_onboarding_submissions FOR INSERT
  WITH CHECK (client_id = auth.uid());
