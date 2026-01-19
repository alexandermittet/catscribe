import os
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

from app.config import settings


STORAGE_ROOT = settings.storage_root
TTL_DAYS = settings.ttl_days


def get_storage_path(fingerprint: str, job_id: str) -> Path:
    """Get storage path for a transcription job"""
    return Path(STORAGE_ROOT) / fingerprint / job_id


def save_transcription_outputs(
    fingerprint: str,
    job_id: str,
    text: str,
    language: str,
    duration: float
) -> Dict[str, str]:
    """Save transcription outputs (.txt, .srt, .vtt) and return file paths"""
    storage_path = get_storage_path(fingerprint, job_id)
    storage_path.mkdir(parents=True, exist_ok=True)
    
    # Save text file
    txt_path = storage_path / "output.txt"
    txt_path.write_text(text, encoding="utf-8")
    
    # Generate SRT (simplified - just one segment)
    srt_path = storage_path / "output.srt"
    srt_content = f"1\n00:00:00,000 --> {format_timestamp(duration)},000\n{text}\n"
    srt_path.write_text(srt_content, encoding="utf-8")
    
    # Generate VTT
    vtt_path = storage_path / "output.vtt"
    vtt_content = f"WEBVTT\n\n00:00:00.000 --> {format_timestamp_vtt(duration)}\n{text}\n"
    vtt_path.write_text(vtt_content, encoding="utf-8")
    
    # Save metadata
    metadata = {
        "job_id": job_id,
        "fingerprint": fingerprint,
        "language": language,
        "duration": duration,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=TTL_DAYS)).isoformat()
    }
    metadata_path = storage_path / "metadata.json"
    metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
    
    return {
        "txt": str(txt_path),
        "srt": str(srt_path),
        "vtt": str(vtt_path)
    }


def format_timestamp(seconds: float) -> str:
    """Format seconds to SRT timestamp (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """Format seconds to VTT timestamp (HH:MM:SS.mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def get_transcription_files(fingerprint: str, job_id: str) -> Optional[Dict[str, str]]:
    """Get paths to transcription output files"""
    storage_path = get_storage_path(fingerprint, job_id)
    
    txt_path = storage_path / "output.txt"
    srt_path = storage_path / "output.srt"
    vtt_path = storage_path / "output.vtt"
    
    if not txt_path.exists():
        return None
    
    return {
        "txt": str(txt_path),
        "srt": str(srt_path),
        "vtt": str(vtt_path)
    }


def delete_transcription(fingerprint: str, job_id: str):
    """Delete transcription files"""
    storage_path = get_storage_path(fingerprint, job_id)
    if storage_path.exists():
        import shutil
        shutil.rmtree(storage_path)


def cleanup_expired_transcriptions():
    """Clean up expired transcription files (should be called periodically)"""
    storage_root = Path(STORAGE_ROOT)
    if not storage_root.exists():
        return
    
    now = datetime.utcnow()
    deleted_count = 0
    
    for fingerprint_dir in storage_root.iterdir():
        if not fingerprint_dir.is_dir():
            continue
        
        for job_dir in fingerprint_dir.iterdir():
            if not job_dir.is_dir():
                continue
            
            metadata_path = job_dir / "metadata.json"
            if not metadata_path.exists():
                # No metadata, delete if older than TTL
                if (datetime.utcnow() - datetime.fromtimestamp(job_dir.stat().st_mtime)) > timedelta(days=TTL_DAYS):
                    import shutil
                    shutil.rmtree(job_dir)
                    deleted_count += 1
                continue
            
            try:
                metadata = json.loads(metadata_path.read_text())
                expires_at = datetime.fromisoformat(metadata.get("expires_at", ""))
                
                if now > expires_at:
                    import shutil
                    shutil.rmtree(job_dir)
                    deleted_count += 1
            except Exception:
                # If we can't parse metadata, delete if old enough
                if (datetime.utcnow() - datetime.fromtimestamp(job_dir.stat().st_mtime)) > timedelta(days=TTL_DAYS):
                    import shutil
                    shutil.rmtree(job_dir)
                    deleted_count += 1
    
    return deleted_count


def generate_job_id() -> str:
    """Generate a unique job ID"""
    return str(uuid.uuid4())
