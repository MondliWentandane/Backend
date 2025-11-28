-- Migration: Add 'refunded' to payment_status enum
-- This allows tracking refunded payments

-- Add 'refunded' to the payment_status enum
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';

-- Note: PostgreSQL doesn't support removing enum values easily
-- If you need to remove 'refunded' in the future, you'll need to:
-- 1. Create a new enum without 'refunded'
-- 2. Update the column to use the new enum
-- 3. Drop the old enum

