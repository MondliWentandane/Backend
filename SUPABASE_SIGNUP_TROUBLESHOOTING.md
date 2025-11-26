# Supabase Signup Troubleshooting Guide

## Issue: Cannot Sign Up with Previously Deleted Email

### Problem
After deleting a user from Supabase, you cannot immediately recreate an account with the same email address.

### Why This Happens
Supabase has a **cooldown period** after user deletion to prevent abuse. Deleted users are not immediately purged from Supabase's system, which prevents immediate recreation with the same email.

---

## Solutions

### Solution 1: Wait for Cooldown Period (Recommended)
**Wait 5-10 minutes** after deleting a user before trying to sign up again with the same email.

1. Delete user from Supabase dashboard
2. Wait 5-10 minutes
3. Try signing up again

---

### Solution 2: Use a Different Email (Quick Fix)
Use a different email address for testing:

```json
{
  "email": "test2@example.com",
  "password": "TestPassword123!",
  "name": "Test User 2",
  "phone_number": "+1234567891",
  "role": "customer"
}
```

**Email Variations:**
- `test+1@example.com`
- `test.user@example.com`
- `test2024@example.com`

---

### Solution 3: Clean Up Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to: Authentication → Users

2. **Check for Deleted Users**
   - Look for users with status "Deleted" or "Soft deleted"
   - These might still be blocking new signups

3. **Permanently Delete (if available)**
   - Some Supabase plans allow permanent deletion
   - This immediately frees up the email

---

### Solution 4: Clean Up PostgreSQL Database

If you deleted users from Supabase but they still exist in your PostgreSQL database:

**Option A: Delete via SQL**
```sql
-- Check existing users
SELECT * FROM users WHERE email = 'your-email@example.com';

-- Delete user from PostgreSQL
DELETE FROM users WHERE email = 'your-email@example.com';
```

**Option B: Use the Updated Signup Endpoint**
The signup endpoint now automatically cleans up existing PostgreSQL records before creating a new user.

---

### Solution 5: Reset Supabase Project (Development Only)

**Warning: This deletes ALL data. Only use in development!**

1. Go to Supabase Dashboard
2. Project Settings → General
3. Delete Project (or create a new project)
4. Update your `.env` file with new credentials

---

## Debugging Steps

### Step 1: Check the Error Message

When you try to sign up, check the exact error:

```json
{
  "error": "User already registered",
  "details": "...",
  "suggestion": "Try using a different email or wait 5-10 minutes..."
}
```

### Step 2: Check Supabase Dashboard

1. Go to **Authentication → Users**
2. Search for your email
3. Check if user exists (even if deleted)

### Step 3: Check PostgreSQL Database

```sql
-- Check if user exists in your database
SELECT * FROM users WHERE email = 'your-email@example.com';
```

### Step 4: Check Server Logs

Look at your server console for detailed error messages:
```bash
npm run dev
```

---

## Updated Signup Endpoint

The signup endpoint has been updated to:
1. **Automatically clean up** existing PostgreSQL records
2. **Provide better error messages** with suggestions
3. **Handle duplicate email errors** more gracefully

### Test the Updated Endpoint

```bash
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "TestPassword123!",
  "name": "New User",
  "phone_number": "+1234567890",
  "role": "customer"
}
```

---

## Common Error Messages

### Error: "User already registered"
**Solution:** Wait 5-10 minutes or use a different email

### Error: "Email rate limit exceeded"
**Solution:** Wait a few minutes before trying again

### Error: "Invalid email format"
**Solution:** Check email format (must be valid email)

### Error: "Password should be at least 6 characters"
**Solution:** Use a password with at least 6 characters

---

## Quick Test Checklist

- [ ] Wait 5-10 minutes after deleting user
- [ ] Try with a different email address
- [ ] Check Supabase dashboard for deleted users
- [ ] Check PostgreSQL database for existing records
- [ ] Verify email confirmation is disabled in Supabase
- [ ] Check server logs for detailed errors
- [ ] Try the updated signup endpoint

---

## Best Practices for Development

1. **Use Test Emails:**
   - `test1@example.com`
   - `test2@example.com`
   - `admin@test.com`
   - `customer@test.com`

2. **Use Email Aliases:**
   - `yourname+test1@gmail.com`
   - `yourname+test2@gmail.com`
   - Gmail treats these as different emails

3. **Clean Up Regularly:**
   - Periodically clean up test users
   - Use SQL to delete from both Supabase and PostgreSQL

4. **Monitor Supabase Dashboard:**
   - Regularly check Authentication → Users
   - Remove test/deleted users

---

## SQL Cleanup Script

If you need to clean up multiple users:

```sql
-- Delete all test users
DELETE FROM users WHERE email LIKE '%test%';

-- Delete specific users
DELETE FROM users WHERE email IN ('user1@example.com', 'user2@example.com');

-- Reset user IDs (optional - only if you want to start from 1)
-- WARNING: This will break foreign key relationships!
-- ALTER SEQUENCE users_user_id_seq RESTART WITH 1;
```

---

## Still Having Issues?

1. **Check Supabase Status:** https://status.supabase.com
2. **Check Supabase Logs:** Dashboard → Logs
3. **Review Error Details:** Check the full error message in Postman response
4. **Try Different Email:** Use a completely new email address

---

Happy Testing!

