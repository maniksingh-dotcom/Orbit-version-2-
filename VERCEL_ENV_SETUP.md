# Vercel Environment Variables Setup

This document lists all environment variables needed for production deployment. Set actual values in Vercel — never commit real credentials to git.

## How to Set Environment Variables in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your "Orbit" project
3. Go to **Settings** → **Environment Variables**
4. Add each variable below
5. Select **Production** environment
6. Click **Save**
7. **Redeploy** your application after adding all variables

---

## Required Environment Variables

### Database (Supabase PostgreSQL)
```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<host>:6543/postgres
```

### Supabase Storage & Client
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Fathom API (Legacy - for webhooks)
```
FATHOM_API_KEY=<your-fathom-api-key>
FATHOM_INVITE_EMAIL=<your-fathom-invite-email>
```

### Fathom OAuth (IMPORTANT - Production Credentials)
**CRITICAL:** Client Secret is DIFFERENT from Webhook Secret!
```
FATHOM_OAUTH_CLIENT_ID=<your-fathom-oauth-client-id>
FATHOM_OAUTH_CLIENT_SECRET=<your-fathom-oauth-client-secret>
FATHOM_WEBHOOK_SECRET=<your-fathom-webhook-secret>
FATHOM_OAUTH_REDIRECT_URI=https://<your-vercel-domain>/api/fathom/callback
```

### Auth.js (Google OAuth)
```
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<your-google-oauth-client-id>
AUTH_GOOGLE_SECRET=<your-google-oauth-client-secret>
NEXTAUTH_URL=https://<your-vercel-domain>
ADMIN_EMAIL=<your-admin-email>
```

### OpenAI
```
OPENAI_API_KEY=<your-openai-api-key>
```

---

## Critical Variables for Fathom OAuth

The following 4 variables are **CRITICAL** for Fathom OAuth to work:

1. **FATHOM_OAUTH_CLIENT_ID** — OAuth Client ID from your Fathom app settings
2. **FATHOM_OAUTH_CLIENT_SECRET** — OAuth Client Secret (NOT the Webhook Secret!)
   - Used as `client_secret` in the OAuth token exchange
   - **CRITICAL:** This is DIFFERENT from `FATHOM_WEBHOOK_SECRET`
3. **FATHOM_WEBHOOK_SECRET** — For webhook verification ONLY, not used in OAuth flow
4. **FATHOM_OAUTH_REDIRECT_URI** — Must exactly match the redirect URI registered in your Fathom OAuth app

---

## Verification Steps

After setting all environment variables:

1. **Redeploy** your application:
   - Go to **Deployments** tab → Click ⋮ on the latest deployment → **Redeploy**

2. **Test Fathom OAuth**:
   - Go to `https://<your-domain>/settings`
   - Click "Connect Fathom" → authorize → verify "Connected" badge shows

3. **Check Logs** (if it fails):
   - Go to **Deployments** → click deployment → **Functions** tab → `/api/fathom/callback`

---

## Fathom OAuth App Configuration

Make sure your Fathom OAuth app settings have:

**Redirect URIs:**
- `http://localhost:3000/api/fathom/callback` (development)
- `https://<your-vercel-domain>/api/fathom/callback` (production)
