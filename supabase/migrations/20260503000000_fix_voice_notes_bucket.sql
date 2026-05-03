-- Fix voice-notes bucket: make public so getPublicUrl URLs actually work
UPDATE storage.buckets SET public = true WHERE id = 'voice-notes';

-- Add UPDATE policy so upsert re-uploads don't fail RLS
CREATE POLICY "Clients can update own voice notes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE user_id = auth.uid()
  )
);

-- Add DELETE policy so discard can clean up orphaned files
CREATE POLICY "Clients can delete own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE user_id = auth.uid()
  )
);
