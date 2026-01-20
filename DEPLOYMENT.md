# Deployment Guide

## Backend (Fly.dev) ✅ DEPLOYED

- **URL**: <https://catscribe-backend.fly.dev>
- **Region**: Stockholm (ARN)
- **Redis**: Connected (solitary-wind-5060)
- **Volume**: catscribe_data (10GB) in ARN

### Secrets Set

- `REDIS_URL`: redis://default:a62e69067c2945f4a468b76d5af4533e@fly-solitary-wind-5060.upstash.io:6379
- `API_KEY`: c025fe9e77d7ec0cab6906ea37f0bf629ed2ae569f8c03e46c3e228d13990ee2
- `ALLOWED_ORIGINS`: <http://localhost:3000,https://frontend-taupe-six-42.vercel.app>

## Frontend (Vercel) ✅ DEPLOYED

- **URL**: <https://frontend-taupe-six-42.vercel.app>
- **Status**: Production deployment active

### ⚠️ CRITICAL: Root Directory Configuration

**This is a monorepo with `backend/` and `frontend/` directories. Vercel MUST be configured to use `frontend/` as the Root Directory.**

**How to set Root Directory (REQUIRED for Git-based deployments):**

1. Go to your Vercel project: <https://vercel.com/dashboard>
2. Click on your project
3. Go to **Settings** → **General**
4. Scroll to **Root Directory**
5. Click **Edit**
6. Set it to: `frontend`
7. Click **Save**

**This setting CANNOT be configured via code** - it must be set in the Vercel dashboard. Without this, Vercel will try to build from the repository root and fail with "Couldn't find any `pages` or `app` directory".

**Note:** This setting applies to all branches/environments. Once set, all deployments will use `frontend/` as the root.

### Environment Variables Set

- `BACKEND_URL` = `https://catscribe-backend.fly.dev`
- `API_KEY` = `c025fe9e77d7ec0cab6906ea37f0bf629ed2ae569f8c03e46c3e228d13990ee2`
- `FRONTEND_URL` = `https://frontend-taupe-six-42.vercel.app`
- `NEXT_PUBLIC_FRONTEND_URL` = `https://frontend-taupe-six-42.vercel.app`
- `NEXT_PUBLIC_API_URL` = `https://catscribe-backend.fly.dev`
- `STRIPE_SECRET_KEY` = (set in Vercel, encrypted)
- `STRIPE_WEBHOOK_SECRET` = (set in Vercel, encrypted)

### Stripe Webhook Configuration

- **Endpoint**: `https://frontend-taupe-six-42.vercel.app/api/webhook`
- **Event**: `checkout.session.completed`
- **API Version**: `2023-10-16` (SDK), `2025-12-15.clover` (Webhook)

## Testing Deployment

1. **Backend Health Check:**

   ```bash
   curl https://catscribe-backend.fly.dev/health
   ```

2. **Frontend:** Visit your Vercel URL

3. **Test Transcription:** Upload a small audio file through the UI

## Troubleshooting

### Backend Issues

- Check logs: `fly logs -a catscribe-backend`
- SSH into machine: `fly ssh console -a catscribe-backend`
- Check secrets: `fly secrets list -a catscribe-backend`

### Frontend Issues

**Build Error: "Couldn't find any `pages` or `app` directory"**

- **Root cause**: Root Directory is not set to `frontend` in Vercel project settings
- **Fix**: Go to Settings → General → Root Directory → Set to `frontend` → Save
- This is the #1 cause of build failures in monorepo setups

**Other Frontend Issues:**

- Check Vercel deployment logs in dashboard
- Verify environment variables are set correctly
- Check browser console for API errors
- Verify Root Directory is set correctly (see above)
