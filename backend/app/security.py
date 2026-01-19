import os
import magic
from fastapi import HTTPException, UploadFile
from typing import Tuple
import mutagen
from mutagen import File as MutagenFile

from app.config import settings


# Allowed file extensions
ALLOWED_EXTENSIONS = set(settings.allowed_extensions)

# MIME types that correspond to audio files
ALLOWED_MIME_TYPES = set(settings.allowed_mime_types)

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # Convert MB to bytes
FREE_TIER_MAX_DURATION = settings.free_tier_max_duration
PAID_TIER_MAX_DURATION = settings.paid_tier_max_duration


def validate_file_extension(filename: str) -> bool:
    """Check if file extension is allowed"""
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    return ext in ALLOWED_EXTENSIONS


def validate_file_type(file_content: bytes) -> bool:
    """Validate file type using magic bytes"""
    try:
        mime = magic.Magic(mime=True)
        detected_mime = mime.from_buffer(file_content[:1024])  # Check first 1KB
        return detected_mime in ALLOWED_MIME_TYPES
    except Exception:
        return False


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal"""
    # Remove directory separators and keep only basename
    basename = os.path.basename(filename)
    # Remove any remaining dangerous characters
    safe_chars = "abcdefghijklmnopqrstuvwxyzæøåABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ0123456789._-"
    sanitized = "".join(c if c in safe_chars else "_" for c in basename)
    return sanitized[:255]  # Limit length


def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using mutagen"""
    try:
        audio_file = MutagenFile(file_path)
        if audio_file is None:
            raise ValueError("Could not determine audio format")
        
        duration = audio_file.info.length
        return duration
    except Exception as e:
        raise ValueError(f"Could not extract audio duration: {str(e)}")


async def validate_upload(file: UploadFile, is_paid: bool = False) -> Tuple[str, float]:
    """
    Validate uploaded file and return sanitized filename and duration.
    Raises HTTPException if validation fails.
    """
    # Check filename extension
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content for validation
    content = await file.read()
    await file.seek(0)  # Reset file pointer
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    
    # Validate file type using magic bytes
    if not validate_file_type(content):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type detected. Please upload a valid audio file."
        )
    
    # Save temporarily to get duration
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Get audio duration
        duration = get_audio_duration(tmp_path)
        
        # Check duration limits
        max_duration = PAID_TIER_MAX_DURATION if is_paid else FREE_TIER_MAX_DURATION
        if duration > max_duration:
            tier_name = "paid (3 hours)" if is_paid else "free (45 minutes)"
            raise HTTPException(
                status_code=400,
                detail=f"Audio duration ({duration/60:.1f} minutes) exceeds {tier_name} limit"
            )
        
        # Sanitize filename
        safe_filename = sanitize_filename(file.filename)
        
        return safe_filename, duration
    
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
