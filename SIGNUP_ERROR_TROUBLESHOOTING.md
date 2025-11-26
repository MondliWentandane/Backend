# Signup Error Troubleshooting Guide

## "Signup failed" Error - How to Debug

The signup endpoint now provides more detailed error messages. Here's how to troubleshoot:

---

## Step 1: Check the Error Response

When you get "Signup failed", look at the **full error response** in Postman:

```json
{
  "error": "Signup failed",
  "details": "More specific error message here",
  "fullError": { ... }
}
```

The `details` field will tell you what went wrong.

---

## Common Errors & Solutions

### Error 1: "Missing required fields"

**Response:**
```json
{
  "error": "Missing required fields",
  "details": "Please provide: email, password, name, and phone_number"
}
```

**Solution:**
Make sure your request body includes all fields:
```json
{
  "email": "test@example.com",
  "password": "Test123!",
  "name": "Test User",
  "phone_number": "+1234567890",
  "role": "customer"
}
```

---

### Error 2: "Invalid email format"

**Response:**
```json
{
  "error": "Invalid email format",
  "details": "Please provide a valid email address"
}
```

**Solution:**
- Use a valid email format: `user@example.com`
- Don't use: `user@`, `@example.com`, `user example.com`

---

### Error 3: "Password too short"

**Response:**
```json
{
  "error": "Password too short",
  "details": "Password must be at least 6 characters long"
}
```

**Solution:**
Use a password with at least 6 characters:
```json
{
  "password": "TestPassword123!"
}
```

---

### Error 4: "Email already exists"

**Response:**
```json
{
  "error": "Email already exists",
  "details": "This email is already registered..."
}
```

**Solutions:**
1. **Use a different email**
2. **Wait 5-10 minutes** if you just deleted the user
3. **Sign in instead** if the account exists

---

### Error 5: "Phone number already exists"

**Response:**
```json
{
  "error": "Phone number already exists",
  "details": "This phone number is already registered..."
}
```

**Solution:**
Use a different phone number:
```json
{
  "phone_number": "+1234567891"  // Different number
}
```

---

### Error 6: "Database connection failed"

**Response:**
```json
{
  "error": "Database connection failed",
  "details": "Cannot connect to database..."
}
```

**Solutions:**

1. **Check your `.env` file:**
   ```env
   PGHOST=your-host
   PGPORT=5432
   PGDATABASE=your-database
   PGUSER=your-username
   PGPASSWORD=your-password
   ```

2. **Verify database is running:**
   - Check if PostgreSQL is running
   - Test connection: `GET /api/test-db`

3. **Check database credentials:**
   - Verify host, port, database name
   - Verify username and password

---

### Error 7: "Supabase connection failed"

**Response:**
```json
{
  "error": "Supabase connection failed",
  "details": "Cannot connect to Supabase..."
}
```

**Solutions:**

1. **Check your `.env` file:**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Verify Supabase credentials:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the correct URL and Service Role Key

3. **Check Supabase status:**
   - Visit: https://status.supabase.com

---

### Error 8: "This email is already registered" (from Supabase)

**Response:**
```json
{
  "error": "This email is already registered...",
  "details": "...",
  "suggestion": "Try using a different email or wait 5-10 minutes..."
}
```

**Solutions:**
1. Wait 5-10 minutes after deleting user
2. Use a different email address
3. Check Supabase Dashboard → Authentication → Users

---

## Debugging Steps

### Step 1: Check Server Logs

Look at your server console (where you ran `npm run dev`):

```bash
Signup error: [Error details here]
```

This will show the actual error.

---

### Step 2: Test Database Connection

Test if your database is working:

```bash
GET http://localhost:3000/api/test-db
```

**Expected Response:**
```json
{
  "message": "Database has successfully connected",
  "time": { ... }
}
```

If this fails, your database connection is the issue.

---

### Step 3: Verify Environment Variables

Check your `.env` file has all required variables:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PostgreSQL
PGHOST=your-host
PGPORT=5432
PGDATABASE=your-database
PGUSER=your-username
PGPASSWORD=your-password
```

**Restart your server** after changing `.env`:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

### Step 4: Check Request Format

Make sure your Postman request is correct:

**URL:**
```
POST http://localhost:3000/api/auth/signup
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "name": "Test User",
  "phone_number": "+1234567890",
  "role": "customer"
}
```

---

### Step 5: Check Database Schema

Verify your `users` table exists and has correct structure:

```sql
-- Check if table exists
SELECT * FROM users LIMIT 1;

-- Check table structure
\d users
```

If table doesn't exist, run your `hotelDatabase.sql` script.

---

## Quick Fixes

### Fix 1: Restart Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Fix 2: Clear PostgreSQL Data
```sql
-- Delete all users (careful!)
DELETE FROM users;
```

### Fix 3: Use Different Email
```json
{
  "email": "test2@example.com",  // Different email
  ...
}
```

### Fix 4: Check Supabase Dashboard
1. Go to Supabase Dashboard
2. Authentication → Users
3. Check if user exists (even if deleted)
4. Wait or use different email

---

## Example: Complete Working Request

**Postman Setup:**

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/auth/signup`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (raw JSON):**
   ```json
   {
     "email": "newuser@example.com",
     "password": "TestPassword123!",
     "name": "New User",
     "phone_number": "+1234567890",
     "role": "customer"
   }
   ```

**Expected Success Response:**
```json
{
  "message": "Signup successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "email": "newuser@example.com",
    "name": "New User",
    "phone_number": "+1234567890",
    "role": "customer",
    ...
  }
}
```

---

## Checklist

Before trying again, check:

- [ ] Server is running (`npm run dev`)
- [ ] All required fields in request body
- [ ] Valid email format
- [ ] Password at least 6 characters
- [ ] Environment variables set correctly
- [ ] Database connection working (`/api/test-db`)
- [ ] Supabase credentials correct
- [ ] Using a new/unique email
- [ ] Request format is correct (JSON)

---

## Still Not Working?

1. **Share the full error response** from Postman
2. **Share server console logs** (the error output)
3. **Check:**
   - Is the server running?
   - Are environment variables set?
   - Is the database accessible?
   - Is Supabase accessible?

The improved error messages should now tell you exactly what's wrong!

