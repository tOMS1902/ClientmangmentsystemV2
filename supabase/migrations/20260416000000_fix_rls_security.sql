-- =============================================================================
-- SECURITY FIX: Close three critical RLS holes
-- 1. Prevent role self-assignment at signup (metadata injection)
-- 2. Prevent clients from promoting themselves to coach via profile UPDATE
-- 3. Scope all coach policies to their own clients only (coach_id = auth.uid())
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FIX 1: Lock signup trigger — always assign 'client', ignore metadata role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'client'  -- ALWAYS client; role is set by coach via service role only
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- FIX 2: Block clients from escalating their own role via profile UPDATE
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "own_profile" ON profiles;

-- Allow users to read their own profile
CREATE POLICY "own_profile_select" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Allow users to update their own profile but NOT the role column
CREATE POLICY "own_profile_update" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- FIX 3: Scope all coach policies to coach_id = auth.uid()
-- (previously any coach could read all coaches' clients)
-- -----------------------------------------------------------------------------

-- clients
DROP POLICY IF EXISTS "coach_clients" ON clients;
CREATE POLICY "coach_clients" ON clients FOR ALL
  USING (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- onboarding_responses: scope via clients table
DROP POLICY IF EXISTS "coach_onboarding" ON onboarding_responses;
CREATE POLICY "coach_onboarding" ON onboarding_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT user_id FROM clients WHERE coach_id = auth.uid())
  );

-- nutrition_targets
DROP POLICY IF EXISTS "coach_targets" ON nutrition_targets;
CREATE POLICY "coach_targets" ON nutrition_targets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- midweek_checks
DROP POLICY IF EXISTS "coach_midweek_checks" ON midweek_checks;
CREATE POLICY "coach_midweek_checks" ON midweek_checks FOR ALL
  USING (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- weekly_checkins
DROP POLICY IF EXISTS "coach_checkins" ON weekly_checkins;
CREATE POLICY "coach_checkins" ON weekly_checkins FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- programmes
DROP POLICY IF EXISTS "coach_programmes" ON programmes;
CREATE POLICY "coach_programmes" ON programmes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- programme_days
DROP POLICY IF EXISTS "coach_days" ON programme_days;
CREATE POLICY "coach_days" ON programme_days FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND programme_id IN (
      SELECT id FROM programmes WHERE client_id IN (
        SELECT id FROM clients WHERE coach_id = auth.uid()
      )
    )
  );

-- exercises
DROP POLICY IF EXISTS "coach_exercises" ON exercises;
CREATE POLICY "coach_exercises" ON exercises FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND day_id IN (
      SELECT id FROM programme_days WHERE programme_id IN (
        SELECT id FROM programmes WHERE client_id IN (
          SELECT id FROM clients WHERE coach_id = auth.uid()
        )
      )
    )
  );

-- session_logs
DROP POLICY IF EXISTS "coach_session_logs" ON session_logs;
CREATE POLICY "coach_session_logs" ON session_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- habits
DROP POLICY IF EXISTS "coach_habits" ON habits;
CREATE POLICY "coach_habits" ON habits FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- habit_logs
DROP POLICY IF EXISTS "coach_habit_logs" ON habit_logs;
CREATE POLICY "coach_habit_logs" ON habit_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- meal_plans
DROP POLICY IF EXISTS "coach_meal_plans" ON meal_plans;
CREATE POLICY "coach_meal_plans" ON meal_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );

-- supplements
DROP POLICY IF EXISTS "coach_supplements" ON supplements;
CREATE POLICY "coach_supplements" ON supplements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    AND client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );
