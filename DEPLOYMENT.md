# Deployment Guide

## Backend Deployment (Fly.dev)

### Prerequisites
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Create Fly account: `fly auth signup`
3. Login: `fly auth login`

### Steps

1. **Create the app**
   ```bash
   cd backend
   fly apps create transkriber-app-backend
   ```

2. **Create persistent volume for models and transcriptions**
   ```bash
   fly volumes create transkriber_data --size 10 --region iad
   ```
   Note: Adjust size (10GB) and region as needed. Models take ~3-5GB.

3. **Set environment variables**
   ```bash
   fly secrets set REDIS_URL="your-upstash-redis-url"
   fly secrets set API_KEY="generate-a-random-secret-key"
   fly secrets set ALLOWED_ORIGINS="https://your-app.vercel.app"
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

5. **Verify deployment**
   ```bash
   fly status
   fly logs
   ```

### Updating the App

```bash
cd backend
fly deploy
```

### Viewing Logs

```bash
fly logs
```

## Frontend Deployment (Vercel)

### Prerequisites
1. Vercel account
2. GitHub repository with the code

### Steps

1. **Import project**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the `frontend` directory as root

2. **Set environment variables**
   ```
   NEXT_PUBLIC_API_URL=https://transkriber-app-backend.fly.dev
   NEXT_PUBLIC_API_KEY=your-api-key-same-as-backend
   NEXT_PUBLIC_FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://transkriber-app-backend.fly.dev
   API_KEY=your-api-key-same-as-backend
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Deploy**
   - Vercel will automatically deploy on push to main branch

4. **Set up Stripe Webhook**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-app.vercel.app/api/webhook`
   - Select events: `checkout.session.completed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Upstash Redis Setup

1. Go to https://upstash.com/
2. Create a new Redis database
3. Copy the Redis URL
4. Use it in backend `REDIS_URL` secret

## Stripe Setup

1. Create account at https://stripe.com/
2. Get API keys from Dashboard
3. For production, use live keys (starts with `sk_live_`)
4. For testing, use test keys (starts with `sk_test_`)
5. Set up webhook endpoint as described above

## Post-Deployment Checklist

- [ ] Backend health check: `curl https://your-backend.fly.dev/health`
- [ ] Frontend loads correctly
- [ ] File upload works
- [ ] Free tier limits enforced
- [ ] Stripe checkout works (test mode)
- [ ] Webhook receives events
- [ ] Credits are added after payment
- [ ] Transcription files download correctly
- [ ] Cleanup job runs (set up cron for `/cleanup` endpoint)

## Setting Up Cleanup Cron

The cleanup endpoint should be called periodically to delete expired transcriptions.

### Option 1: Fly.dev Cron Jobs
```bash
fly cron schedule "0 * * * *" --command "curl -X POST https://your-backend.fly.dev/cleanup -H 'X-API-Key: your-key'"
```

### Option 2: External Cron Service
Use a service like cron-job.org to call the cleanup endpoint hourly.
