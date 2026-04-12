-- Add loom_sent flag to clients for coach weekly workflow
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loom_sent boolean DEFAULT false;
