-- Run this script in the Supabase SQL Editor to add the auto-incrementing serial_id

ALTER TABLE distributors 
ADD COLUMN serial_id BIGINT GENERATED ALWAYS AS IDENTITY;
