# Postman Testing Guide for Hotel App Authentication

## Prerequisites

1. **Start your server:**
   ```bash
   npm run dev
   ```
   Server should be running on `http://localhost:3000` (or your configured PORT)

2. **Environment Variables Required:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

3. **Postman Setup:**
   - Create a new Collection: "Hotel App Auth"
   - Create an Environment: "Local Development"
   - Add variables:
     - `base_url`: `http://localhost:3000`
     - `token`: (will be set automatically after login)

---

## Authentication Endpoints

### 1. **Sign Up** - Create New User

**Endpoint:** `POST {{base_url}}/api/auth/signup`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123!",
  "name": "Test User",
  "phone_number": "+1234567890",
  "role": "customer"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Signup successful — verification email sent.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "email": "testuser@example.com",
    "name": "Test User",
    "phone_number": "+1234567890",
    "role": "customer",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Note:** 
- If email confirmation is disabled in Supabase, you'll get tokens immediately
- If enabled, `token` and `refreshToken` will be `null` until email is verified

**Test Script (Postman):**
```javascript
// Save token to environment if available
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
        pm.environment.set("refreshToken", jsonData.refreshToken);
        console.log("Token saved to environment");
    }
}
```

---

### 2. **Sign In** - Login Existing User

**Endpoint:** `POST {{base_url}}/api/auth/signin`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123!"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "email": "testuser@example.com",
    "name": "Test User",
    "phone_number": "+1234567890",
    "role": "customer",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Test Script (Postman):**
```javascript
// Save tokens to environment
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("token", jsonData.token);
    pm.environment.set("refreshToken", jsonData.refreshToken);
    pm.environment.set("user_id", jsonData.user.user_id);
    console.log("Login successful - Tokens saved");
}
```

**Error Responses:**
- `400 Bad Request`: Invalid credentials
  ```json
  {
    "error": "Invalid login credentials"
  }
  ```
- `404 Not Found`: User not in database
  ```json
  {
    "error": "User not found in database"
  }
  ```

---

### 3. **Google OAuth Sign In** - Initiate Google Login

**Endpoint:** `POST {{base_url}}/api/auth/signin/google`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "redirectUrl": "http://localhost:3000/auth/callback"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Google OAuth started",
  "url": "https://supabase.co/auth/v1/authorize?provider=google&..."
}
```

**Note:** 
- This returns a URL that should be opened in a browser
- User will be redirected to Google for authentication
- After Google auth, user is redirected to `redirectUrl`

---

### 4. **Forgot Password** - Request Password Reset

**Endpoint:** `POST {{base_url}}/api/auth/forgot-password`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "testuser@example.com"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Password reset email sent."
}
```

**Note:** 
- Check the email inbox for password reset link
- The link will redirect to: `http://localhost:3000/auth/reset-password`

---

### 5. **Reset Password** - Update Password from Email Link

**Endpoint:** `POST {{base_url}}/api/auth/reset-password`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePassword123!",
  "email": "testuser@example.com"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Password updated successfully",
  "user": {
    "id": "uuid-here",
    "email": "testuser@example.com",
    ...
  }
}
```

**Note:** 
- `access_token` comes from the password reset email link
- Password is updated in both Supabase and PostgreSQL

---

### 6. **Refresh Token** - Get New Access Token

**Endpoint:** `POST {{base_url}}/api/auth/refresh-token`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Test Script (Postman):**
```javascript
// Update tokens in environment
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("token", jsonData.token);
    pm.environment.set("refreshToken", jsonData.refreshToken);
    console.log("Tokens refreshed and saved");
}
```

**Error Response (401):**
```json
{
  "error": "Invalid or expired refresh token"
}
```

---

## Testing Protected Routes

### Using the Token in Requests

After signing in, use the token in protected endpoints:

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Example: Testing verifyAuth Middleware**

Create a test endpoint or use an existing protected route:

**Endpoint:** `GET {{base_url}}/api/test-protected` (if you create one)

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response (200 OK):**
```json
{
  "message": "Access granted",
  "user": {
    "user_id": 1,
    "email": "testuser@example.com",
    "role": "customer"
  }
}
```

**Error Response (401):**
```json
{
  "message": "Unauthorized: No token provided"
}
```

**Error Response (403):**
```json
{
  "message": "Invalid or expired token"
}
```

---

## Postman Collection Setup

### Step 1: Create Environment Variables

1. Click **Environments** → **+** → **Create Environment**
2. Name: "Local Development"
3. Add variables:
   - `base_url`: `http://localhost:3000`
   - `token`: (leave empty, will be auto-filled)
   - `refreshToken`: (leave empty, will be auto-filled)
   - `user_id`: (leave empty, will be auto-filled)

### Step 2: Create Collection

1. Click **Collections** → **+** → **New Collection**
2. Name: "Hotel App Auth"
3. Set collection to use "Local Development" environment

### Step 3: Add Requests

Create these requests in order:

1. **Sign Up** → `POST {{base_url}}/api/auth/signup`
2. **Sign In** → `POST {{base_url}}/api/auth/signin`
3. **Refresh Token** → `POST {{base_url}}/api/auth/refresh-token`
4. **Forgot Password** → `POST {{base_url}}/api/auth/forgot-password`
5. **Reset Password** → `POST {{base_url}}/api/auth/reset-password`
6. **Google OAuth** → `POST {{base_url}}/api/auth/signin/google`

### Step 4: Add Test Scripts

For requests that return tokens, add this in the **Tests** tab:

```javascript
// Auto-save token
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
        console.log("Token saved to environment");
    }
    if (jsonData.refreshToken) {
        pm.environment.set("refreshToken", jsonData.refreshToken);
        console.log("Refresh token saved");
    }
}

// Status code check
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

---

## Testing Scenarios

### Scenario 1: Complete User Registration Flow

1. **Sign Up** with new email
2. Check response for tokens (or email verification)
3. If email verification required, verify email first
4. **Sign In** with credentials
5. Save tokens from response

### Scenario 2: Token Refresh Flow

1. **Sign In** to get tokens
2. Wait for token to expire (or use expired token)
3. **Refresh Token** with refresh_token
4. Verify new tokens are returned
5. Use new token in protected routes

### Scenario 3: Password Reset Flow

1. **Forgot Password** with registered email
2. Check email for reset link
3. Extract `access_token` from reset link
4. **Reset Password** with new password
5. **Sign In** with new password

### Scenario 4: Error Handling

Test these error cases:

1. **Sign Up** with existing email → Should return error
2. **Sign In** with wrong password → Should return 400
3. **Sign In** with non-existent email → Should return 400
4. **Refresh Token** with invalid token → Should return 401
5. Protected route without token → Should return 401
6. Protected route with expired token → Should return 403

---

## 🐛 Common Issues & Solutions

### Issue 1: "User not found in database"
**Solution:** Make sure user exists in PostgreSQL `users` table. Sign up first.

### Issue 2: "Invalid or expired token"
**Solution:** 
- Token might be expired (default: 1 hour)
- Use refresh token to get new access token
- Or sign in again

### Issue 3: "Email already registered"
**Solution:** 
- User already exists in Supabase
- Try signing in instead
- Or use a different email

### Issue 4: "Database connection failed"
**Solution:** 
- Check PostgreSQL is running
- Verify environment variables are set correctly
- Check database credentials

### Issue 5: "SUPABASE_URL not set"
**Solution:** 
- Add `SUPABASE_URL` to your `.env` file
- Restart the server

---

## Sample Test Data

### Admin User
```json
{
  "email": "admin@hotel.com",
  "password": "AdminPass123!",
  "name": "Admin User",
  "phone_number": "+1234567890",
  "role": "admin"
}
```

### Customer User
```json
{
  "email": "customer@example.com",
  "password": "CustomerPass123!",
  "name": "Customer User",
  "phone_number": "+1234567891",
  "role": "customer"
}
```

---

## Quick Test Checklist

- [ ] Server is running
- [ ] Environment variables are set
- [ ] Postman environment is configured
- [ ] Sign Up works
- [ ] Sign In works
- [ ] Tokens are saved automatically
- [ ] Refresh Token works
- [ ] Forgot Password sends email
- [ ] Reset Password updates password
- [ ] Protected routes require token
- [ ] Invalid tokens are rejected

---

## Pro Tips

1. **Use Collection Variables:** Set `base_url` at collection level for easy switching between dev/staging/prod

2. **Pre-request Scripts:** Add scripts to auto-generate test data:
   ```javascript
   // Generate random email
   const randomEmail = `test${Date.now()}@example.com`;
   pm.environment.set("test_email", randomEmail);
   ```

3. **Test Automation:** Use Postman's Collection Runner to test all endpoints in sequence

4. **Environment Switching:** Create multiple environments (Local, Staging, Production) for easy testing

5. **Save Responses:** Save example responses as examples in Postman for documentation

---

Happy Testing!

