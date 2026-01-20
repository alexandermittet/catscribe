import os
import tempfile
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.requests import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.models import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionResult,
    ModelSize,
    ALLOWED_MODELS,
    MinutesBalance,
    UsageLimit
)
from app.transcription import transcribe_audio, estimate_transcription_time
from app.security import validate_upload
from app.storage import (
    save_transcription_outputs,
    get_transcription_files,
    generate_job_id,
    cleanup_expired_transcriptions
)
from app.redis_client import RedisClient
from app.config import settings


# Initialize Redis client
redis_client = RedisClient()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Whisper Transcription API")

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
allowed_origins = settings.allowed_origins.split(",")
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
    if not settings.api_key:
        return True  # Skip if not configured (dev mode)
    return x_api_key == settings.api_key


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
    minutes = usage.get("minutes", 0.0)
    
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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid model size: {model}")
    
    # Check if model is allowed (memory constraints for 2GB machine)
    if model_size not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{model_size.value}' is currently unavailable due to server memory constraints. Please use tiny, base, or small models."
        )
    
    # Check free tier limits
    if not is_paid:
        tiny_base_minutes_used = usage.get("tiny_base_minutes_used", 0.0)
        premium_minutes_used = usage.get("premium_minutes_used", 0.0)
        duration_minutes = duration / 60.0
        
        if model_size in [ModelSize.TINY, ModelSize.BASE]:
            remaining_free_minutes = 45.0 - tiny_base_minutes_used
            if duration_minutes > remaining_free_minutes:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient free minutes. Required: {duration_minutes:.1f}, Available: {remaining_free_minutes:.1f}"
                )
        elif model_size == ModelSize.SMALL:
            # Only small model allowed in free tier premium minutes (medium/large disabled due to RAM)
            remaining_premium_minutes = 5.0 - premium_minutes_used
            if duration_minutes > remaining_premium_minutes:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient premium minutes. Required: {duration_minutes:.1f}, Available: {remaining_premium_minutes:.1f}"
                )
    
    # Check minutes balance for paid users
    if is_paid:
        duration_minutes = duration / 60.0
        if minutes < duration_minutes:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient minutes. Required: {duration_minutes:.1f}, Available: {minutes:.1f}"
            )
    
    # Generate job ID
    job_id = generate_job_id()
    
    # Estimate transcription time
    estimated_time = estimate_transcription_time(duration, model_size)
    
    # Store initial job metadata with estimated time
    redis_client.store_job_metadata(job_id, {
        "fingerprint": fingerprint,
        "status": "processing",
        "duration": duration,
        "model": model_size.value,
        "progress": 0.0,
        "elapsed_time": 0.0,
        "estimated_total_time": estimated_time,
        "time_remaining": estimated_time
    })
    
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(safe_filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    # Process transcription in background
    def process_transcription():
        try:
            logger.info(f"Starting transcription for job {job_id}, model: {model_size.value}, duration: {duration}s, language: {language}")
            
            # Update status to processing
            redis_client.store_job_metadata(job_id, {
                "fingerprint": fingerprint,
                "status": "processing",
                "duration": duration,
                "model": model_size.value,
                "progress": 0.0,
                "elapsed_time": 0.0,
                "estimated_total_time": estimated_time,
                "time_remaining": estimated_time
            })
            
            # Define progress callback
            def update_progress(progress: float, elapsed_time: float, estimated_total_time: float):
                logger.info(f"Job {job_id} progress: {progress:.1%}, elapsed: {elapsed_time:.1f}s, estimated: {estimated_total_time:.1f}s")
                redis_client.update_job_progress(job_id, progress, elapsed_time, estimated_total_time)
            
            # Run transcription with progress tracking
            logger.info(f"Calling transcribe_audio for job {job_id}")
            result = transcribe_audio(
                tmp_path, 
                model_size, 
                language,
                audio_duration=duration,
                progress_callback=update_progress
            )
            logger.info(f"Transcription completed for job {job_id}, language detected: {result.get('language')}, text length: {len(result.get('text', ''))}")
            
            # Save outputs
            logger.info(f"Saving transcription outputs for job {job_id}")
            save_transcription_outputs(
                fingerprint=fingerprint,
                job_id=job_id,
                text=result["text"],
                language=result["language"],
                duration=duration
            )
            
            # Update usage
            logger.info(f"Updating usage for fingerprint {fingerprint}")
            redis_client.increment_usage(fingerprint, model_size.value, is_paid, duration_seconds=duration)
            
            # Deduct minutes if paid (subtract actual minutes transcribed)
            if is_paid:
                duration_minutes = duration / 60.0
                redis_client.deduct_minutes(fingerprint, duration_minutes)
            
            # Store job metadata
            logger.info(f"Marking job {job_id} as completed")
            redis_client.store_job_metadata(job_id, {
                "fingerprint": fingerprint,
                "status": "completed",
                "language": result["language"],
                "duration": duration,
                "model": model_size.value
            })
            # Verify it was stored correctly
            verification = redis_client.get_job_metadata(job_id)
            logger.info(f"Verified job {job_id} metadata after storing: status={verification.get('status') if verification else None}")
            
        except Exception as e:
            logger.error(f"Transcription failed for job {job_id}: {str(e)}", exc_info=True)
            redis_client.store_job_metadata(job_id, {
                "fingerprint": fingerprint,
                "status": "failed",
                "error": str(e)
            })
        finally:
            # Delete audio file immediately
            try:
                os.unlink(tmp_path)
                logger.info(f"Deleted temporary file {tmp_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {tmp_path}: {str(e)}")
    
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
    """Get transcription result or progress"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get job metadata
    metadata = redis_client.get_job_metadata(job_id)
    logger.info(f"GET /transcription/{job_id}: Retrieved metadata from Redis: status={metadata.get('status') if metadata else None}, metadata_keys={list(metadata.keys()) if metadata else None}")
    if not metadata:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    # Verify fingerprint matches
    if metadata.get("fingerprint") != fingerprint:
        raise HTTPException(status_code=403, detail="Access denied")
    
    status = metadata.get("status", "queued")
    logger.info(f"GET /transcription/{job_id}: Determined status={status}, will return branch: {status}")
    
    # If still processing or queued, return progress data
    if status in ["queued", "processing"]:
        return TranscriptionResult(
            job_id=job_id,
            text="",  # Empty text while processing
            language=metadata.get("language", "unknown"),
            duration=metadata.get("duration", 0),
            download_urls={},  # No download URLs yet
            status=status,
            progress=metadata.get("progress", 0.0),
            elapsed_time=metadata.get("elapsed_time", 0.0),
            estimated_total_time=metadata.get("estimated_total_time"),
            time_remaining=metadata.get("time_remaining")
        )
    
    # If completed, return full result
    if status == "completed":
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
            download_urls=download_urls,
            status="completed"
        )
    
    # If failed
    raise HTTPException(status_code=500, detail=metadata.get("error", "Transcription failed"))


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


@app.get("/minutes", response_model=MinutesBalance)
async def get_minutes(
    fingerprint: str = Query(...),
    x_api_key: Optional[str] = Header(None)
):
    """Get minutes balance"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    usage = redis_client.get_usage(fingerprint)
    return MinutesBalance(
        minutes=usage.get("minutes", 0.0),
        email=usage.get("email")
    )


@app.post("/minutes/add")
async def add_minutes(
    fingerprint: str = Form(...),
    email: str = Form(...),
    minutes: float = Form(...),
    x_api_key: Optional[str] = Header(None)
):
    """Add minutes to an account (called by Stripe webhook)"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    usage = redis_client.get_usage(fingerprint)
    current_minutes = usage.get("minutes", 0.0)
    new_minutes = current_minutes + minutes
    
    redis_client.set_minutes(fingerprint, new_minutes, email)
    
    return {"success": True, "minutes": new_minutes}


@app.post("/minutes/add-by-email")
async def add_minutes_by_email(
    email: str = Form(...),
    minutes: float = Form(...),
    x_api_key: Optional[str] = Header(None)
):
    """Add minutes to a pending bucket for an email. Admin-only (X-API-Key). Recipient claims via app: Already bought? click here → enter email."""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if minutes <= 0:
        raise HTTPException(status_code=400, detail="Minutes must be positive")
    total = redis_client.add_minutes_by_email(email.strip(), minutes)
    return {"success": True, "minutes": total}


@app.post("/minutes/claim", response_model=MinutesBalance)
async def claim_minutes(
    fingerprint: str = Form(...),
    email: str = Form(...),
    x_api_key: Optional[str] = Header(None)
):
    """Claim minutes by email address (Stripe purchase or admin-add-by-email)"""
    if not verify_api_key(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Validate email format
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    email_lower = email.lower().strip()

    # First: if admin added minutes by email (pending bucket), merge into this fingerprint
    merged = redis_client.merge_pending_into_fingerprint(fingerprint, email_lower)
    if merged:
        return MinutesBalance(
            minutes=merged.get("minutes", 0.0),
            email=merged.get("email")
        )
    
    # Else: find existing usage by email (e.g. from Stripe) and link
    existing = redis_client.find_usage_by_email(email_lower)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="No minutes found for this email address"
        )
    
    usage = redis_client.link_fingerprint_to_email(fingerprint, email_lower)
    
    return MinutesBalance(
        minutes=usage.get("minutes", 0.0),
        email=usage.get("email")
    )


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
    
    tiny_base_minutes_used = usage.get("tiny_base_minutes_used", 0.0)
    premium_minutes_used = usage.get("premium_minutes_used", 0.0)
    
    return UsageLimit(
        remaining_tiny_base=int(max(0, settings.free_tiny_base_minutes - tiny_base_minutes_used)),
        remaining_small=int(max(0, settings.free_premium_minutes - premium_minutes_used)),
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
