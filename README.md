# Transkriber - Audio Transcription Service

A web application for transcribing audio files using OpenAI Whisper, with a free tier and pay-per-use credits.

## Architecture

- **Frontend**: Next.js 14 on Vercel
- **Backend**: FastAPI (Python) on Fly.dev
- **Transcription**: OpenAI Whisper (local models)
- **Database**: Upstash Redis
- **Payments**: Stripe Checkout

### Architecture Diagram

```mermaid
graph TB
    subgraph Client[Client Browser]
        User[User]
        UI["Next.js Frontend<br/>Vercel"]
    end
    
    subgraph FrontendServices[Frontend Services]
        APIProxy["Next.js API Routes<br/>/api/transcribe<br/>/api/checkout<br/>/api/webhook"]
        Fingerprint["FingerprintJS<br/>Device Tracking"]
    end
    
    subgraph BackendServices[Backend Services - Fly.dev]
        FastAPI["FastAPI Backend<br/>Stockholm ARN"]
        Whisper["OpenAI Whisper<br/>Model Cache"]
        Storage["Persistent Volume<br/>Models & Transcripts"]
    end
    
    subgraph ExternalServices[External Services]
        Stripe["Stripe Checkout<br/>Payment Processing"]
        Redis["Upstash Redis<br/>Usage & Credits"]
    end
    
    User -->|"Upload Audio"| UI
    UI -->|"API Calls"| APIProxy
    UI -->|"Device ID"| Fingerprint
    
    APIProxy -->|"Proxy Requests"| FastAPI
    APIProxy -->|"Create Session"| Stripe
    Stripe -->|"Webhook"| APIProxy
    
    FastAPI -->|"Load Models"| Whisper
    Whisper -->|"Cache Models"| Storage
    FastAPI -->|"Store Outputs"| Storage
    FastAPI -->|"Check Usage"| Redis
    FastAPI -->|"Update Credits"| Redis
    
    APIProxy -->|"Add Credits"| Redis
```

### Data Flow

1. **File Upload**: User uploads audio → Frontend → Backend API
2. **Transcription**: Backend loads Whisper model → Processes audio → Stores results
3. **Usage Tracking**: Backend checks Redis for free tier limits
4. **Payment Flow**: User purchases credits → Stripe Checkout → Webhook → Redis credits updated
5. **Result Retrieval**: User downloads transcription files from backend storage

## Features

- Drag-and-drop audio file upload
- Multiple language support with auto-detection
- 5 model quality tiers (tiny to large)
- Free tier: 3 tiny/base + 1 small transcriptions
- Paid tier: Pay-per-use credits, max 3 hours per file
- Transcription outputs stored for 7 days (.txt, .srt, .vtt)
- Device fingerprinting for usage tracking
- Stripe Checkout integration for credit purchases
- Admin pricing: Special $1 pricing for <admin@admitted.dk>

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
BACKEND_URL=https://transkriber-app-backend.fly.dev
API_KEY=your-secret-api-key
FRONTEND_URL=https://frontend-taupe-six-42.vercel.app
NEXT_PUBLIC_FRONTEND_URL=https://frontend-taupe-six-42.vercel.app
NEXT_PUBLIC_API_URL=https://transkriber-app-backend.fly.dev
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

See `frontend/.env.local.example` for a template.

## Deployment

### Current Deployment Status

- **Frontend**: ✅ Deployed at <https://frontend-taupe-six-42.vercel.app>
- **Backend**: ✅ Deployed at <https://transkriber-app-backend.fly.dev>
- **Region**: Stockholm (ARN)
- **Redis**: Upstash Redis (solitary-wind-5060)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Backend (Fly.dev)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly apps create transkriber-app-backend`
4. Create volume: `fly volumes create transkriber_data --size 10 --region arn`
5. Create Redis: `fly redis create transkriber-redis --region arn`
6. Set secrets:

   ```bash
   fly secrets set REDIS_URL=...
   fly secrets set API_KEY=...
   fly secrets set ALLOWED_ORIGINS=...
   ```

7. Deploy: `fly deploy`

### Frontend (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Set environment variables:

   ```bash
   vercel env add BACKEND_URL production
   vercel env add API_KEY production
   vercel env add STRIPE_SECRET_KEY production
   vercel env add STRIPE_WEBHOOK_SECRET production
   # ... etc
   ```

5. Redeploy: `vercel --prod`

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

**Admin Pricing**: Email `admin@admitted.dk` receives $1 pricing for any package.

## License

MIT
