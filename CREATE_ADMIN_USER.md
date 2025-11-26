# How to Create an Admin User

There are **3 ways** to create an admin user:

## Method 1: Sign Up with Admin Role (Recommended)

Use the signup endpoint with `role: "admin"` in the request body.

### Using Postman:

**Endpoint:** `POST http://localhost:3000/api/auth/signup`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!",
  "name": "Admin User",
  "phone_number": "+1234567890",
  "role": "admin"
}
```

**Response:**
```json
{
  "message": "Signup successful",
  "token": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "user_id": 1,
    "email": "admin@example.com",
    "name": "Admin User",
    "phone_number": "+1234567890",
    "role": "admin",
    "created_at": "2025-11-26T07:00:00.000Z",
    "updated_at": "2025-11-26T07:00:00.000Z"
  }
}
```

### Using cURL:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "name": "Admin User",
    "phone_number": "+1234567890",
    "role": "admin"
  }'
```

---

## Method 2: Update Existing User to Admin

If you already have a user account, you can update their role to admin directly in the database.

### Using SQL (Supabase SQL Editor or psql):

```sql
-- Update existing user to admin
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'user@example.com';
```

**Note:** Replace `'user@example.com'` with the actual email of the user you want to make admin.

---

## Method 3: Create Admin User via SQL Script

Run the SQL script provided in `src/migrations/create_admin_user.sql` (see below).

---

## Verify Admin User

After creating an admin user, test it by:

1. **Sign in:**
   ```json
   POST http://localhost:3000/api/auth/signin
   {
     "email": "admin@example.com",
     "password": "AdminPassword123!"
   }
   ```

2. **Test Admin Endpoint** (requires admin role):
   ```
   GET http://localhost:3000/api/bookings
   Authorization: Bearer <your-token>
   ```

   If you get a list of bookings (or empty array), you're an admin!
   If you get `403 Access Denied: Admins only`, the role wasn't set correctly.

---

## Admin Capabilities

Once you have an admin user, you can:

- ✅ Create, update, delete hotels
- ✅ Create, update, delete rooms
- ✅ View all bookings (not just your own)
- ✅ Update booking status
- ✅ Manage hotel and room photos
- ✅ View any user's profile
- ✅ Create notifications for any user

---

## Security Note

⚠️ **Important:** Make sure to:
- Use a strong password for admin accounts
- Keep admin credentials secure
- Only create admin users for trusted personnel
- Consider adding additional security measures (2FA, IP restrictions, etc.)

