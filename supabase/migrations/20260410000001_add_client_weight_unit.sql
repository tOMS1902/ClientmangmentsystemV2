-- Add weight_unit preference to clients table
-- Determines how weights are displayed in the client portal and coach view

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs'));
