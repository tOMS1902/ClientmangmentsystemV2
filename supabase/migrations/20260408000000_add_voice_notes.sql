-- Add voice note URL columns to check-in tables
ALTER TABLE weekly_checkins ADD COLUMN IF NOT EXISTS voice_note_url text;
ALTER TABLE midweek_checks ADD COLUMN IF NOT EXISTS voice_note_url text;

-- Create the voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: clients can upload their own voice notes
CREATE POLICY "Clients can upload voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE user_id = auth.uid()
  )
);

-- RLS: clients can read their own voice notes
CREATE POLICY "Clients can read own voice notes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    -- client reads their own
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- coach reads their clients' notes
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM clients WHERE coach_id = auth.uid()
    )
  )
);
