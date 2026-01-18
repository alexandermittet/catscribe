import os
import tempfile
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.requests import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Optional

from app.models import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionResult,
    ModelSize,
    CreditBalance,
    UsageLimit
)
from app.transcription import transcribe_audio, calculate_credit_cost
from app.security import validate_upload, FREE_TIER_MAX_DURATION, PAID_TIER_MAX_DURATION
from app.storage import (
    save_transcription_outputs,
    get_transcription_files,
    generate_job_id,
    cleanup_expired_transcriptions
)
from app.redis_client import RedisClient


# Initialize Redis client
redis_client = RedisClient()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Whisper Transcription API")

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Background task for cleanup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure directories exist
    os.makedirs("/data/whisper_models", exist_ok=True)
    os.makedirs("/data/transcriptions", exist_ok=True)
    yield
    # Shutdown: cleanup if needed

app.router.lifespan_context = lifespan


def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """Verify API key from header"""
    expected_key = os.getenv("API_KEY")
    if not expected_key:
        return True  # Skip if not configured (dev mode)
    return x_api_key == expected_key


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form("auto"),
    model: str = Form("base"),
    fingerprint: str = Form(...),
    x_api_key: Optional[str] = Header(None)
):
    """Transcribe audio file"""
    # Rate limiting - check manually (skip for now in dev, will add back later)
    # rate_limit_key = get_remote_address(request) if request else "unknown"
    # if not redis_client.set_rate_limit(rate_limit_key, 10, 3600):
    #     raise HTTPException(status_code=429, detail="Rate limit exceeded: 10 requests per hour")
    # Verify API key
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get usage info
    usage = redis_client.get_usage(fingerprint)
    is_paid = usage.get("is_paid", False)
    credits = usage.get("credits", 0.0)
    
    # Validate and get file info
    try:
        safe_filename, duration = await validate_upload(file, is_paid=is_paid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File validation failed: {str(e)}")
    
    # Parse model size
    try:
        model_size = ModelSize(model.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid model size: {model}")
    
    # Check free tier limits
    if not is_paid:
        tiny_base_count = usage.get("tiny_base_count", 0)
        small_count = usage.get("small_count", 0)
        
        if model_size in [ModelSize.TINY, ModelSize.BASE]:
            if tiny_base_count >= 3:
                raise HTTPException(
                    status_code=403,
                    detail="Free tier limit reached: 3 transcriptions with tiny/base models"
                )
        elif model_size == ModelSize.SMALL:
            if small_count >= 1:
                raise HTTPException(
                    status_code=403,
                    detail="Free tier limit reached: 1 transcription with small model"
                )
            if tiny_base_count < 3:
                raise HTTPException(
                    status_code=403,
                    detail="Free tier: Must use 3 tiny/base transcriptions before using small model"
                )
    
    # Check credit balance for paid users
    if is_paid:
        cost = calculate_credit_cost(duration, model_size)
        if credits < cost:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits. Required: {cost:.1f}, Available: {credits:.1f}"
            )
    
    # Generate job ID
    job_id = generate_job_id()
    
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(safe_filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    # Process transcription in background
    async def process_transcription():
        try:
            # Run transcription
            result = transcribe_audio(tmp_path, model_size, language)
            
            # Save outputs
            save_transcription_outputs(
                fingerprint=fingerprint,
                job_id=job_id,
                text=result["text"],
                language=result["language"],
                duration=duration
            )
            
            # Update usage
            redis_client.increment_usage(fingerprint, model_size.value, is_paid)
            
            # Deduct credits if paid
            if is_paid:
                cost = calculate_credit_cost(duration, model_size)
                redis_client.deduct_credits(fingerprint, cost)
            
            # Store job metadata
            redis_client.store_job_metadata(job_id, {
                "fingerprint": fingerprint,
                "status": "completed",
                "language": result["language"],
                "duration": duration,
                "model": model_size.value
            })
            
        except Exception as e:
            redis_client.store_job_metadata(job_id, {
                "fingerprint": fingerprint,
                "status": "failed",
                "error": str(e)
            })
        finally:
            # Delete audio file immediately
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
    
    background_tasks.add_task(process_transcription)
    
    return TranscriptionResponse(
        job_id=job_id,
        status="queued",
        message="Transcription started"
    )


@app.get("/transcription/{job_id}", response_model=TranscriptionResult)
async def get_transcription(
    job_id: str,
    fingerprint: str = Query(...),
    x_api_key: Optional[str] = Header(None)
):
    """Get transcription result"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get job metadata
    metadata = redis_client.get_job_metadata(job_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    # Verify fingerprint matches
    if metadata.get("fingerprint") != fingerprint:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get files
    files = get_transcription_files(fingerprint, job_id)
    if not files:
        raise HTTPException(status_code=404, detail="Transcription files not found")
    
    # Read text file
    with open(files["txt"], "r", encoding="utf-8") as f:
        text = f.read()
    
    # Build download URLs (relative paths for now)
    download_urls = {
        "txt": f"/download/{job_id}/txt",
        "srt": f"/download/{job_id}/srt",
        "vtt": f"/download/{job_id}/vtt"
    }
    
    return TranscriptionResult(
        job_id=job_id,
        text=text,
        language=metadata.get("language", "unknown"),
        duration=metadata.get("duration", 0),
        download_urls=download_urls
    )


@app.get("/download/{job_id}/{format}")
async def download_transcription(
    job_id: str,
    format: str,
    fingerprint: str = Query(...),
    x_api_key: Optional[str] = Header(None)
):
    """Download transcription file"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get job metadata
    metadata = redis_client.get_job_metadata(job_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    # Verify fingerprint
    if metadata.get("fingerprint") != fingerprint:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get files
    files = get_transcription_files(fingerprint, job_id)
    if not files:
        raise HTTPException(status_code=404, detail="Transcription files not found")
    
    # Get file path
    if format not in files:
        raise HTTPException(status_code=400, detail=f"Invalid format: {format}")
    
    file_path = files[format]
    
    # Determine media type
    media_types = {
        "txt": "text/plain",
        "srt": "text/srt",
        "vtt": "text/vtt"
    }
    
    return FileResponse(
        file_path,
        media_type=media_types.get(format, "application/octet-stream"),
        filename=f"transcription.{format}"
    )


@app.get("/credits", response_model=CreditBalance)
async def get_credits(
    fingerprint: str = Query(...),
    x_api_key: Optional[str] = Header(None)
):
    """Get credit balance"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    usage = redis_client.get_usage(fingerprint)
    return CreditBalance(
        credits=usage.get("credits", 0.0),
        email=usage.get("email")
    )


@app.post("/credits/add")
async def add_credits(
    fingerprint: str = Form(...),
    email: str = Form(...),
    credits: float = Form(...),
    x_api_key: Optional[str] = Header(None)
):
    """Add credits to an account (called by Stripe webhook)"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    usage = redis_client.get_usage(fingerprint)
    current_credits = usage.get("credits", 0.0)
    new_credits = current_credits + credits
    
    redis_client.set_credits(fingerprint, new_credits, email)
    
    return {"success": True, "credits": new_credits}


@app.get("/usage", response_model=UsageLimit)
async def get_usage_limits(
    fingerprint: str = Query(...),
    x_api_key: Optional[str] = Header(None)
):
    """Get usage limits for free tier"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    usage = redis_client.get_usage(fingerprint)
    is_paid = usage.get("is_paid", False)
    
    if is_paid:
        return UsageLimit(
            remaining_tiny_base=999,
            remaining_small=999,
            is_paid=True
        )
    
    tiny_base_count = usage.get("tiny_base_count", 0)
    small_count = usage.get("small_count", 0)
    
    return UsageLimit(
        remaining_tiny_base=max(0, 3 - tiny_base_count),
        remaining_small=max(0, 1 - small_count),
        is_paid=False
    )


@app.post("/cleanup")
async def cleanup_expired(
    x_api_key: Optional[str] = Header(None)
):
    """Manual cleanup endpoint (should be called by cron)"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    deleted = cleanup_expired_transcriptions()
    return {"deleted": deleted, "message": f"Cleaned up {deleted} expired transcriptions"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
