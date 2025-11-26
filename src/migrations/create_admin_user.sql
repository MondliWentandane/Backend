-- Migration: Create Admin User
-- Run this SQL in your PostgreSQL database (Supabase SQL Editor)
-- 
-- IMPORTANT: Replace the values below with your desired admin credentials
-- After running, you can sign in with these credentials

-- Option 1: Create a new admin user directly in the database
-- Note: You'll still need to create the user in Supabase Auth for authentication
-- Use Method 1 (signup endpoint) instead, or follow these steps:

-- Step 1: Create user in Supabase Auth first (via signup endpoint with role='admin')
-- Step 2: Or manually create in Supabase Dashboard → Authentication → Users

-- Step 3: If user exists in Supabase but not in PostgreSQL, insert here:
-- INSERT INTO users (email, password_hash, name, phone_number, role)
-- VALUES (
--   'admin@example.com',
--   '$2a$10$YourHashedPasswordHere',  -- Use bcrypt to hash password first
--   'Admin User',
--   '+1234567890',
--   'admin'
-- );

-- Option 2: Update existing user to admin role
-- UPDATE users 
-- SET role = 'admin', updated_at = NOW()
-- WHERE email = 'existing-user@example.com';

-- Option 3: Check current admin users
SELECT user_id, email, name, phone_number, role, created_at
FROM users
WHERE role = 'admin';

-- Option 4: List all users and their roles
SELECT user_id, email, name, role, created_at
FROM users
ORDER BY created_at DESC;

