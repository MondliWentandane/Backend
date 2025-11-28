-- Migration: Add number_of_rooms to Bookings table
-- Run this SQL in your PostgreSQL database

ALTER TABLE Bookings 
ADD COLUMN IF NOT EXISTS number_of_rooms INT DEFAULT 1 CHECK (number_of_rooms > 0 AND number_of_rooms <= 10);

-- Update existing bookings to have 1 room (default)
UPDATE Bookings SET number_of_rooms = 1 WHERE number_of_rooms IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE Bookings 
ALTER COLUMN number_of_rooms SET NOT NULL;



