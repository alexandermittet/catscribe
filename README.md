# Transkriber - Audio Transcription Service

A web application for transcribing audio files using OpenAI Whisper, with a free tier and pay-per-use credits.

## Architecture

- **Frontend**: Next.js 14 on Vercel
- **Backend**: FastAPI (Python) on Fly.dev
- **Transcription**: OpenAI Whisper (local models)
- **Database**: Upstash Redis
- **Payments**: Stripe Checkout

## Features

- Drag-and-drop audio file upload
- Multiple language support with auto-detection
- 5 model quality tiers (tiny to large)
- Free tier: 3 tiny/base + 1 small transcriptions
- Paid tier: Pay-per-use credits, max 3 hours per file
- Transcription outputs stored for 7 days (.txt, .srt, .vtt)
- Device fingerprinting for usage tracking
- Stripe integration for credit purchases

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend)
- Python 3.11+ (for backend, optional)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Or use Docker:

```bash
docker-compose up backend
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

#### Backend (.env or fly secrets)

```
REDIS_URL=redis://...
API_KEY=your-secret-api-key
ALLOWED_ORIGINS=https://your-app.vercel.app
```

#### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=https://your-backend.fly.dev
NEXT_PUBLIC_API_KEY=your-secret-api-key
NEXT_PUBLIC_FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-backend.fly.dev
API_KEY=your-secret-api-key
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deployment

### Backend (Fly.dev)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly apps create transkriber-app-backend`
4. Create volume: `fly volumes create transkriber_data --size 10`
5. Set secrets:
   ```bash
   fly secrets set REDIS_URL=...
   fly secrets set API_KEY=...
   fly secrets set ALLOWED_ORIGINS=...
   ```
6. Deploy: `fly deploy`

### Frontend (Vercel)

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

## Security

- File type validation (magic bytes)
- Duration limits (45min free, 3hr paid)
- Rate limiting (10 req/hour)
- API key authentication
- Stripe webhook signature verification
- CORS protection
- Security headers (CSP, X-Frame-Options, etc.)

## Credit Pricing

| Model | Cost per minute |
|-------|-----------------|
| Tiny  | 0.5 credits     |
| Base  | 1 credit        |
| Small | 2 credits       |
| Medium| 4 credits       |
| Large | 8 credits       |

Packages:
- 50 credits - $5
- 120 credits - $10
- 300 credits - $20

## License

MIT
