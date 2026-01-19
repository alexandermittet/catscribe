from faster_whisper import WhisperModel
import os
import tempfile
import time
from typing import Optional, Callable
from app.models import ModelSize
from app.config import settings


# Model cache in memory
model_cache = {}


def get_model_cache_dir() -> str:
    """Get the directory for caching Whisper models"""
    cache_dir = settings.model_cache_dir
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir


def load_model(size: ModelSize) -> WhisperModel:
    """Load Whisper model, using cache if available"""
    size_str = size.value
    
    if size_str not in model_cache:
        cache_dir = get_model_cache_dir()
        model_cache[size_str] = WhisperModel(
            size_str,
            download_root=cache_dir,
            device="cpu",
            compute_type="int8",
            cpu_threads=2  # Use both CPUs on Fly.io free tier (2 shared CPUs)
        )
    
    return model_cache[size_str]


def transcribe_audio(
    audio_path: str,
    model_size: ModelSize,
    language: Optional[str] = None,
    audio_duration: Optional[float] = None,
    progress_callback: Optional[Callable[[float, float, float], None]] = None
) -> dict:
    """
    Transcribe audio file using faster-whisper.
    
    Args:
        audio_path: Path to audio file
        model_size: Whisper model size
        language: Language code or None for auto-detect
        audio_duration: Duration of audio in seconds (for progress tracking)
        progress_callback: Optional callback(progress, elapsed_time, estimated_total_time)
    
    Returns:
        dict with keys: text, language, segments
    """
    model = load_model(model_size)
    
    # Prepare language parameter
    lang = None if language == "auto" or language is None else language
    
    # Run transcription - faster-whisper returns (segments, info) tuple
    segments, info = model.transcribe(
        audio_path,
        language=lang
    )
    
    start_time = time.time()
    segments_list = []
    last_progress_value = 0.0
    last_update_time = start_time
    
    # Iterate through segments to track progress
    for segment in segments:
        segments_list.append(segment)
        
        # Update progress if callback provided and audio duration known
        if progress_callback and audio_duration and audio_duration > 0:
            # Calculate progress based on segment end time
            progress = min(1.0, segment.end / audio_duration)
            elapsed_time = time.time() - start_time
            current_time = time.time()
            
            # Only update progress every 1% or every 2 seconds to avoid too many Redis writes
            if progress - last_progress_value >= 0.01 or current_time - last_update_time >= 2.0:
                # Estimate total time based on current progress
                if progress > 0.01:  # Avoid division by zero
                    estimated_total_time = elapsed_time / progress
                else:
                    estimated_total_time = estimate_transcription_time(audio_duration, model_size)
                
                progress_callback(progress, elapsed_time, estimated_total_time)
                last_progress_value = progress
                last_update_time = current_time
    
    # Reconstruct full text from segments
    text = " ".join([segment.text for segment in segments_list]).strip()
    
    # Convert segments to dict format for compatibility
    segments_dict = [
        {
            "text": segment.text,
            "start": segment.start,
            "end": segment.end
        }
        for segment in segments_list
    ]
    
    return {
        "text": text,
        "language": info.language,
        "segments": segments_dict
    }


def estimate_transcription_time(duration_seconds: float, model_size: ModelSize) -> float:
    """
    Estimate transcription time in seconds based on audio duration and model size.
    Estimates are conservative for Fly.io free tier (2 shared CPUs, INT8).
    
    Real-time factors (RTF) - how many times faster than real-time:
    - tiny: ~5-10x realtime
    - base: ~4-8x realtime  
    - small: ~3-5x realtime
    - medium: ~1-2x realtime
    - large: <1x realtime (may not fit in 2GB RAM)
    
    Using conservative estimates (lower RTF) to avoid over-promising.
    """
    # Conservative real-time factors for Fly.io free tier (2 CPUs, INT8)
    rtf_factors = {
        ModelSize.TINY: 5.0,      # 5x realtime
        ModelSize.BASE: 4.0,       # 4x realtime
        ModelSize.SMALL: 3.0,      # 3x realtime
        ModelSize.MEDIUM: 1.5,    # 1.5x realtime
        ModelSize.LARGE: 0.5,      # 0.5x realtime (slower than real-time)
    }
    
    rtf = rtf_factors.get(model_size, 4.0)
    # Transcription time = audio duration / real-time factor
    estimated_time = duration_seconds / rtf
    
    return estimated_time


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
