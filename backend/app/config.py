from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    # Environment
    environment: str = "development"
    
    # API
    api_key: Optional[str] = None
    allowed_origins: str = "http://localhost:3000"
    
    # Redis
    redis_url: Optional[str] = None
    
    # File Limits
    max_file_size_mb: int = 500
    allowed_extensions: List[str] = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aiff"]
    
    # MIME Types
    allowed_mime_types: List[str] = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
        "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/ogg", "audio/vorbis",
        "audio/flac", "audio/x-flac", "video/webm", "video/mp4", "video/quicktime"
    ]
    
    # Duration Limits (seconds)
    free_tier_max_duration: int = 2700  # 45 min
    paid_tier_max_duration: int = 10800  # 3 hours
    
    # Free Tier Minutes
    free_tiny_base_minutes: float = 45.0
    free_premium_minutes: float = 5.0
    
    # Storage
    storage_root: str = "/data/transcriptions"
    model_cache_dir: str = "/data/whisper_models"
    ttl_days: int = 7
    
    class Config:
        env_file = ".env"
        env_prefix = ""
        case_sensitive = False


# Create global settings instance
settings = Settings()
