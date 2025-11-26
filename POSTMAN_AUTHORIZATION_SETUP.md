# Postman Authorization Setup Guide

## Authorization Type: Bearer Token

For this API, you need to use **Bearer Token** authorization in Postman.

---

## Step-by-Step Setup

### Method 1: Using Authorization Tab (Recommended)

1. **Open Postman** and create/open a request

2. **Click on the "Authorization" tab** (below the URL bar)

3. **Select "Bearer Token" from the Type dropdown**
   - You'll see: `Type: Bearer Token`

4. **Enter your token in the Token field**
   - This is the token you received from:
     - Sign In: `POST /api/auth/signin`
     - Sign Up: `POST /api/auth/signup` (if email confirmation is disabled)

5. **Token Format:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ...
   ```
   (Just paste the full token - no "Bearer" prefix needed)

6. **Click "Send"** - Postman will automatically add it to the headers as:
   ```
   Authorization: Bearer <your-token>
   ```

---

## Visual Guide

```
┌─────────────────────────────────────────┐
│  POST  http://localhost:3000/api/hotels │
├─────────────────────────────────────────┤
│  Params | Authorization | Headers | ... │
│         └───────────────┘                │
│                                          │
│  Type: [Bearer Token ▼]                 │
│                                          │
│  Token: [eyJhbGciOiJIUzI1NiIsInR5cCI...]│
│         └───────────────────────────────┘
│                                          │
│  [Send]                                  │
└─────────────────────────────────────────┘
```

---

## Alternative: Manual Header Setup

If you prefer to set it manually:

1. **Go to "Headers" tab**

2. **Add a new header:**
   - Key: `Authorization`
   - Value: `Bearer <your-token>`
   
   Example:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Important:** Include the word "Bearer" followed by a space, then your token

---

## Using Environment Variables (Best Practice)

### Step 1: Get Your Token

1. **Sign In:**
   ```
   POST http://localhost:3000/api/auth/signin
   Body: {
     "email": "admin@hotel.com",
     "password": "AdminPass123!"
   }
   ```

2. **Copy the token** from the response:
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "...",
     "user": {...}
   }
   ```

### Step 2: Set Environment Variable

1. **Click on your environment** (top right: "Local Development" or create one)

2. **Add variable:**
   - Variable: `token`
   - Initial Value: (leave empty)
   - Current Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your token)

3. **Save**

### Step 3: Use in Authorization

1. **Go to Authorization tab**

2. **Select "Bearer Token"**

3. **In Token field, type:** `{{token}}`
   - Postman will automatically replace `{{token}}` with the value from your environment

---

## Auto-Save Token (Advanced)

Add this script to your **Sign In** request in the **Tests** tab:

```javascript
// Auto-save token to environment
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
        console.log("Token saved to environment");
    }
    if (jsonData.refreshToken) {
        pm.environment.set("refreshToken", jsonData.refreshToken);
    }
}
```

Then in your Authorization tab, use: `{{token}}`

---

## Quick Reference

| Authorization Type | Value |
|-------------------|-------|
| **Type** | `Bearer Token` |
| **Token Field** | `{{token}}` or your actual token |
| **Header Generated** | `Authorization: Bearer <token>` |

---

## Testing Checklist

- [ ] Authorization tab selected
- [ ] Type set to "Bearer Token"
- [ ] Token entered (or `{{token}}` if using environment variable)
- [ ] Token is valid (not expired)
- [ ] Environment variable set (if using `{{token}}`)

---

## Common Mistakes

### Wrong: Selecting "No Auth"
- This won't send the token
- You'll get `401 Unauthorized`

### Wrong: Using "Basic Auth"
- This is for username/password, not JWT tokens
- You'll get `401 Unauthorized`

### Wrong: Adding "Bearer" in Token field
- Postman adds "Bearer" automatically
- Just paste the token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Don't write: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Wrong: Expired Token
- Tokens expire after 1 hour (default)
- Use refresh token or sign in again

---

## Token Refresh

If your token expires:

1. **Use Refresh Token endpoint:**
   ```
   POST http://localhost:3000/api/auth/refresh-token
   Body: {
     "refresh_token": "{{refreshToken}}"
   }
   ```

2. **Update your environment variable** with the new token

Or simply **sign in again** to get a new token.

---

## Example Screenshots Description

### Authorization Tab:
```
┌─────────────────────────────────────┐
│ Authorization                       │
├─────────────────────────────────────┤
│ Type: [Bearer Token        ▼]     │
│                                     │
│ Token: [{{token}}            ]     │
│                                     │
│ [Preview]                           │
│ Authorization: Bearer {{token}}    │
└─────────────────────────────────────┘
```

### Headers Tab (Alternative):
```
┌─────────────────────────────────────┐
│ Headers                             │
├─────────────────────────────────────┤
│ Key              Value              │
│ Authorization    Bearer {{token}}   │
│ Content-Type     application/json   │
└─────────────────────────────────────┘
```

---

## Summary

**For this API, always use:**
- **Type:** `Bearer Token`
- **Token:** Your Supabase JWT token (or `{{token}}` variable)
- **Location:** Authorization tab in Postman

That's it! Postman will automatically format it as:
```
Authorization: Bearer <your-token>
```

Happy Testing!

