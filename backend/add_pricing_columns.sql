-- Add new columns for Gujarat
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_gujarat_sabhasad REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_gujarat_mantri REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_gujarat_distributor REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_gujarat_field_officer REAL;

-- Add new columns for Maharashtra
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_maharashtra_sabhasad REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_maharashtra_mantri REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_maharashtra_distributor REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_maharashtra_field_officer REAL;

-- Add new columns for Madhya Pradesh
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_mp_sabhasad REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_mp_mantri REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_mp_distributor REAL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_mp_field_officer REAL;
