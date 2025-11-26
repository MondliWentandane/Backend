-- Migration: Add number_of_guests to Bookings table
-- Run this SQL in your PostgreSQL database

ALTER TABLE Bookings 
ADD COLUMN IF NOT EXISTS number_of_guests INT DEFAULT 1 CHECK (number_of_guests > 0 AND number_of_guests <= 20);

-- Update existing bookings to have 1 guest (default)
UPDATE Bookings SET number_of_guests = 1 WHERE number_of_guests IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE Bookings 
ALTER COLUMN number_of_guests SET NOT NULL;


