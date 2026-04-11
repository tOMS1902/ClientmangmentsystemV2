-- Add structured score/rating fields to weekly_checkins
-- These replace the legacy free-text summary fields for new check-in submissions

ALTER TABLE weekly_checkins
  ADD COLUMN IF NOT EXISTS week_score       smallint CHECK (week_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS energy_score     smallint CHECK (energy_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS sleep_score      smallint CHECK (sleep_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS hunger_score     smallint CHECK (hunger_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS cravings_score   smallint CHECK (cravings_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS diet_rating      text CHECK (diet_rating IN ('on_track','mostly_on_track','mixed','off_track')),
  ADD COLUMN IF NOT EXISTS training_completed text CHECK (training_completed IN ('all','missed_1','missed_2plus','none')),
  ADD COLUMN IF NOT EXISTS focus_areas      text;
