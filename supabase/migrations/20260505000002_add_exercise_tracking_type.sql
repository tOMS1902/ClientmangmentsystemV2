ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tracking_type text CHECK (tracking_type IN ('weight', 'bodyweight', 'band', 'time', 'distance')) DEFAULT 'weight';
