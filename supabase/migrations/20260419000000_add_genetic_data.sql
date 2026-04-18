-- Add genetic_data JSONB column to store structured genetics report data
ALTER TABLE diagnostic_reports
  ADD COLUMN IF NOT EXISTS genetic_data JSONB DEFAULT NULL;
