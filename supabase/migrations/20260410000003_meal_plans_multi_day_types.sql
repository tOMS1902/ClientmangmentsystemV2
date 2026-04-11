-- Allow any text as day_type (not just 'training' or 'rest')
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_day_type_check;

-- Add times_per_week so each plan can specify how many days per week it's eaten
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS times_per_week integer NOT NULL DEFAULT 1 CHECK (times_per_week BETWEEN 1 AND 7);
