# Local Development Setup

## Quick Start

### 1. Start Backend & Redis

```bash
# Option 1: Use the startup script
./start.sh

# Option 2: Manual
docker-compose up -d
```

This will start:
- Backend API at http://localhost:8000
- Redis at localhost:6379

### 2. Start Frontend

```bash
# Option 1: Use the startup script
./start-frontend.sh

# Option 2: Manual
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:3000

## Verify Everything Works

1. **Check backend health:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"ok"}`

2. **Check Redis:**
   ```bash
   docker-compose exec redis redis-cli ping
   ```
   Should return: `PONG`

3. **Open browser:**
   - Go to http://localhost:3000
   - You should see the upload interface

## Testing Transcription

1. Upload a small audio file (MP3, WAV, etc.)
2. Select language and model
3. Click "Start Transcription"
4. Wait for processing (first time will download the model)
5. Download the result

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f redis

# Stop services
docker-compose down

# Stop and remove volumes (clears cached models)
docker-compose down -v

# Rebuild backend
docker-compose build backend
docker-compose up -d backend

# Access Redis CLI
docker-compose exec redis redis-cli

# Check backend API docs
open http://localhost:8000/docs
```

## Troubleshooting

### Backend won't start
- Check Docker is running: `docker info`
- Check logs: `docker-compose logs backend`
- Check port 8000 is free: `lsof -i :8000`

### Redis connection errors
- Wait a few seconds for Redis to fully start
- Check Redis logs: `docker-compose logs redis`
- Verify Redis is healthy: `docker-compose exec redis redis-cli ping`

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:8000/health`
- Check `NEXT_PUBLIC_API_URL` in frontend/.env.local (should be `http://localhost:8000`)
- Check browser console for CORS errors

### Models downloading slowly
- First transcription will download the model (can take 1-5 minutes)
- Models are cached in Docker volume `whisper_data`
- To clear cache: `docker-compose down -v` (will re-download on next start)

### Port already in use
- Change ports in docker-compose.yml:
  - Backend: `"8001:8000"` (use 8001 instead of 8000)
  - Redis: `"6380:6379"` (use 6380 instead of 6379)
- Update frontend `.env.local` accordingly

## Environment Variables

### Backend (in docker-compose.yml)
- `REDIS_URL`: Automatically set to `redis://redis:6379`
- `API_KEY`: Set to `dev-key-change-in-production` (change for production)
- `ALLOWED_ORIGINS`: Set to `http://localhost:3000`

### Frontend (create `frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=dev-key-change-in-production
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
API_KEY=dev-key-change-in-production
STRIPE_SECRET_KEY=sk_test_...  # Optional for local dev
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional for local dev
```

## Development Tips

1. **Hot reload**: Frontend changes reload automatically. Backend requires restart: `docker-compose restart backend`

2. **View API docs**: http://localhost:8000/docs (Swagger UI)

3. **Test API directly:**
   ```bash
   curl -X POST http://localhost:8000/transcribe \
     -F "file=@test.mp3" \
     -F "language=auto" \
     -F "model=base" \
     -F "fingerprint=test123" \
     -H "X-API-Key: dev-key-change-in-production"
   ```

4. **Check stored data:**
   ```bash
   # View Redis keys
   docker-compose exec redis redis-cli KEYS "*"
   
   # View usage for a fingerprint
   docker-compose exec redis redis-cli GET "usage:your-fingerprint"
   ```
