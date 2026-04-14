-- Add legal onboarding flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS legal_onboarding_complete boolean DEFAULT false;

-- Legal onboarding submissions
-- NOTE: This table stores legally binding consent records.
-- Records must NOT be deleted except via formal GDPR Art.17 erasure requests.
-- bloodwork_consent and genetics_consent fields contain GDPR Art.9 special category data.
CREATE TABLE IF NOT EXISTS legal_onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL UNIQUE,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,

  -- Personal details
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  dob date NOT NULL,
  country text NOT NULL,
  role text,
  firm text,

  -- PAR-Q health screening (8 yes/no questions)
  parq_q1 boolean NOT NULL,
  parq_q2 boolean NOT NULL,
  parq_q3 boolean NOT NULL,
  parq_q4 boolean NOT NULL,
  parq_q5 boolean NOT NULL,
  parq_q6 boolean NOT NULL,
  parq_q7 boolean NOT NULL,
  parq_q8 boolean NOT NULL,
  parq_health_details text NOT NULL,
  parq_medications text NOT NULL,

  -- Consent fields
  -- SPECIAL CATEGORY DATA (GDPR Art.9): bloodwork_consent, genetics_consent
  bloodwork_consent text NOT NULL CHECK (bloodwork_consent IN ('consented', 'not_applicable')),
  genetics_consent text NOT NULL CHECK (genetics_consent IN ('consented', 'not_applicable')),
  photo_storage_consent text NOT NULL CHECK (photo_storage_consent IN ('consented', 'declined')),
  photo_marketing_consent text NOT NULL CHECK (photo_marketing_consent IN ('consented', 'declined')),

  -- Legal agreements
  tc_agreed boolean NOT NULL,
  cooling_off_waived boolean NOT NULL,
  privacy_agreed boolean NOT NULL,
  age_confirmed boolean NOT NULL,
  medical_disclaimer_confirmed boolean NOT NULL,
  guarantee_understood boolean NOT NULL,
  accuracy_confirmed boolean NOT NULL,

  -- Digital signature
  digital_signature text NOT NULL,
  signature_date date NOT NULL,

  -- GDPR erasure tracking (minimal record retained on erasure request)
  erasure_requested boolean DEFAULT false,
  erasure_requested_at timestamptz
);

-- Row Level Security
ALTER TABLE legal_onboarding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_read_legal_submissions"
  ON legal_onboarding_submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "clients_read_own_legal_submission"
  ON legal_onboarding_submissions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "clients_insert_own_legal_submission"
  ON legal_onboarding_submissions FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM legal_onboarding_submissions WHERE client_id = auth.uid()
    )
  );
-- No UPDATE or DELETE for clients — legal records are immutable
-- Service role bypasses RLS for admin / erasure operations
