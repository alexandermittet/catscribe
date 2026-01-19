from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class ModelSize(str, Enum):
    TINY = "tiny"
    BASE = "base"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class TranscriptionRequest(BaseModel):
    language: Optional[str] = Field(None, description="Language code (e.g., 'en', 'da') or 'auto'")
    model: ModelSize = Field(ModelSize.BASE, description="Whisper model size")


class TranscriptionResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    message: Optional[str] = None


class TranscriptionResult(BaseModel):
    job_id: str
    text: str
    language: str
    duration: float
    download_urls: dict[str, str]  # format -> url
    # Progress fields (only present when status is "processing")
    status: Optional[Literal["queued", "processing", "completed", "failed"]] = None
    progress: Optional[float] = None  # 0.0 to 1.0
    elapsed_time: Optional[float] = None  # seconds
    estimated_total_time: Optional[float] = None  # seconds
    time_remaining: Optional[float] = None  # seconds


class MinutesBalance(BaseModel):
    minutes: float
    email: Optional[str] = None


class UsageLimit(BaseModel):
    remaining_tiny_base: int
    remaining_small: int
    is_paid: bool
