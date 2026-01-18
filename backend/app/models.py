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


class CreditBalance(BaseModel):
    credits: float
    email: Optional[str] = None


class UsageLimit(BaseModel):
    remaining_tiny_base: int
    remaining_small: int
    is_paid: bool
