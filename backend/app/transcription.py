import whisper
import os
import tempfile
from typing import Optional
from app.models import ModelSize
from app.config import settings


# Model cache in memory
model_cache = {}


def get_model_cache_dir() -> str:
    """Get the directory for caching Whisper models"""
    cache_dir = settings.model_cache_dir
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir


def load_model(size: ModelSize) -> whisper.Whisper:
    """Load Whisper model, using cache if available"""
    size_str = size.value
    
    if size_str not in model_cache:
        cache_dir = get_model_cache_dir()
        model_cache[size_str] = whisper.load_model(
            size_str,
            download_root=cache_dir
        )
    
    return model_cache[size_str]


def transcribe_audio(
    audio_path: str,
    model_size: ModelSize,
    language: Optional[str] = None
) -> dict:
    """
    Transcribe audio file using Whisper.
    
    Returns:
        dict with keys: text, language, segments
    """
    model = load_model(model_size)
    
    # Prepare language parameter
    lang = None if language == "auto" or language is None else language
    
    # Run transcription
    result = model.transcribe(
        audio_path,
        language=lang,
        verbose=False
    )
    
    return {
        "text": result["text"].strip(),
        "language": result["language"],
        "segments": result.get("segments", [])
    }


def calculate_credit_cost(duration_seconds: float, model_size: ModelSize) -> float:
    """Calculate credit cost based on duration and model size"""
    duration_minutes = duration_seconds / 60
    
    multipliers = {
        ModelSize.TINY: 0.5,
        ModelSize.BASE: 1.0,
        ModelSize.SMALL: 2.0,
        ModelSize.MEDIUM: 4.0,
        ModelSize.LARGE: 8.0
    }
    
    multiplier = multipliers.get(model_size, 1.0)
    return duration_minutes * multiplier
