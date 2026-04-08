-- Allow voice-only submissions: make previously-required fields nullable
ALTER TABLE weekly_checkins ALTER COLUMN weight DROP NOT NULL;

ALTER TABLE midweek_checks ALTER COLUMN training_on_track DROP NOT NULL;
ALTER TABLE midweek_checks ALTER COLUMN food_on_track DROP NOT NULL;
ALTER TABLE midweek_checks ALTER COLUMN energy_level DROP NOT NULL;
ALTER TABLE midweek_checks ALTER COLUMN steps_on_track DROP NOT NULL;
