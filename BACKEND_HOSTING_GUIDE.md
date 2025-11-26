# Backend Hosting Guide

## Is Backend Hosting Required?

**Short Answer: YES, for production use.**

While your database is already hosted on Supabase, your **backend API server** also needs to be hosted for the following reasons:

### Why Host the Backend?

1. **Frontend Access**: Your frontend (web/mobile app) needs to call your API endpoints. If the backend is only on `localhost:3000`, it won't be accessible to users.

2. **Production Deployment**: For a real application, users need to access your API from anywhere, not just your local machine.

3. **Database Connection**: Even though your database is on Supabase, your backend code needs to run somewhere to connect to it.

4. **24/7 Availability**: Hosted backends run continuously, unlike local servers that stop when you close your computer.

---

## Hosting Options for Node.js/Express Backend

### 1. **Vercel** (Recommended for Easy Setup)
- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ Serverless functions
- ✅ Easy environment variable setup
- ⚠️ May need adjustments for long-running connections

**Setup:**
```bash
npm i -g vercel
vercel
```

### 2. **Railway** (Great for Full-Stack Apps)
- ✅ Free tier with $5 credit/month
- ✅ Easy PostgreSQL integration
- ✅ Automatic deployments
- ✅ Simple environment variable management
- ✅ Good for Supabase connections

**Website:** https://railway.app

### 3. **Render** (Popular Alternative)
- ✅ Free tier available (with limitations)
- ✅ Automatic SSL
- ✅ Easy GitHub integration
- ✅ Environment variable management
- ⚠️ Free tier spins down after inactivity

**Website:** https://render.com

### 4. **Heroku** (Traditional Option)
- ✅ Well-established platform
- ✅ Good documentation
- ⚠️ No free tier anymore (paid plans only)
- ⚠️ More expensive

**Website:** https://www.heroku.com

### 5. **AWS/Google Cloud/Azure** (Enterprise)
- ✅ Highly scalable
- ✅ Full control
- ⚠️ More complex setup
- ⚠️ Requires more technical knowledge
- ⚠️ Can be expensive

---

## What You Need to Configure When Hosting

### 1. Environment Variables

Your backend needs these environment variables (already in your `.env` file):

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# PostgreSQL (Supabase Database)
PGHOST=aws-1-eu-central-2.pooler.supabase.com
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres.your-project-ref
PGPASSWORD=your-password
PGSSLMODE=require

# App
PORT=3000
```

**Important:** Add these to your hosting platform's environment variable settings (NOT in code).

### 2. Update Base URL

After hosting, update your frontend to use the new backend URL:

**Before (Local):**
```
http://localhost:3000/api
```

**After (Hosted):**
```
https://your-backend.railway.app/api
// or
https://your-backend.vercel.app/api
// etc.
```

### 3. CORS Configuration

Make sure your backend allows requests from your frontend domain. Check if you have CORS configured in your `app.ts` or `server.ts`.

---

## Step-by-Step: Hosting on Railway (Example)

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your backend repository

### 3. Add Environment Variables
- Go to your project → Variables
- Add all variables from your `.env` file:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PGHOST`
  - `PGPORT`
  - `PGDATABASE`
  - `PGUSER`
  - `PGPASSWORD`
  - `PGSSLMODE`
  - `PORT` (optional, Railway sets this automatically)

### 4. Configure Build Settings
Railway will auto-detect Node.js, but you can specify:
- **Build Command:** `npm install` (or leave default)
- **Start Command:** `npm start` or `npm run dev`

### 5. Deploy
- Railway will automatically deploy when you push to GitHub
- You'll get a URL like: `https://your-app.railway.app`

### 6. Update Frontend
- Change your API base URL to the Railway URL
- Test all endpoints

---

## Step-by-Step: Hosting on Vercel (Example)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Create `vercel.json` (if needed)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.ts"
    }
  ]
}
```

### 3. Deploy
```bash
vercel
```

### 4. Add Environment Variables
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add all variables from your `.env` file

---

## Important Considerations

### 1. **Database Connection Pooling**
Since you're using Supabase Transaction Pooler, your connection settings should work fine on hosted platforms. The pooler handles multiple connections efficiently.

### 2. **Port Configuration**
Most hosting platforms set the `PORT` environment variable automatically. Your code should use:
```typescript
const PORT = process.env.PORT || 3000;
```

### 3. **Health Check Endpoint**
Consider adding a health check endpoint for monitoring:
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### 4. **Logging**
Make sure your hosted backend has proper logging. Most platforms provide logs in their dashboard.

### 5. **SSL/HTTPS**
All major hosting platforms provide SSL certificates automatically (HTTPS). Your API will be accessible via `https://`.

---

## Testing After Hosting

1. **Test Database Connection:**
   ```
   GET https://your-backend.railway.app/api/test-db
   ```

2. **Test Authentication:**
   ```
   POST https://your-backend.railway.app/api/auth/signup
   ```

3. **Test Protected Endpoints:**
   ```
   GET https://your-backend.railway.app/api/hotels
   Authorization: Bearer <token>
   ```

---

## Cost Comparison

| Platform | Free Tier | Paid Plans |
|----------|-----------|------------|
| **Vercel** | ✅ Generous free tier | $20/month+ |
| **Railway** | ✅ $5 credit/month | Pay-as-you-go |
| **Render** | ✅ Free tier (limited) | $7/month+ |
| **Heroku** | ❌ No free tier | $7/month+ |
| **AWS** | ✅ Free tier (limited) | Pay-as-you-go |

---

## Recommendation

For your hotel app, I recommend:

1. **Railway** - Best balance of ease and features, works great with Supabase
2. **Vercel** - If you want the easiest setup and don't need long-running connections
3. **Render** - Good alternative if Railway doesn't work for you

---

## Next Steps

1. Choose a hosting platform
2. Create an account
3. Connect your GitHub repository
4. Add environment variables
5. Deploy
6. Update frontend with new API URL
7. Test all endpoints
8. Update `FRONTEND_API_DOCUMENTATION.md` with production URL

---

## Troubleshooting

### Connection Issues
- Verify all environment variables are set correctly
- Check that `PGHOST` and `PGPORT` match your Supabase pooler settings
- Ensure `PGSSLMODE=require` is set

### Build Failures
- Check that `package.json` has correct `start` script
- Verify Node.js version compatibility
- Check build logs in hosting platform dashboard

### CORS Errors
- Add your frontend domain to CORS allowed origins
- Check CORS middleware configuration

---

## Summary

**Yes, you need to host your backend** for production use. Your database being on Supabase doesn't eliminate the need for a hosted backend server. Choose a platform that fits your needs and budget, configure environment variables, and deploy!

