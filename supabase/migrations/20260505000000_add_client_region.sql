ALTER TABLE clients ADD COLUMN IF NOT EXISTS region text CHECK (region IN ('EU', 'US')) DEFAULT 'EU';
