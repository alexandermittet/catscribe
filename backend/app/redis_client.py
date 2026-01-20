import redis
import os
import json
import time
from typing import Optional, Dict, Any, List, Tuple

from app.config import settings


class RedisClient:
    def __init__(self):
        redis_url = settings.redis_url
        if not redis_url:
            print("Warning: REDIS_URL not set. Running in fallback mode (no persistence)")
            self.client = None
            return
        
        try:
            self.client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.client.ping()
            print("Redis connected successfully")
        except Exception as e:
            print(f"Warning: Redis connection failed: {e}")
            print("Running in fallback mode (no persistence)")
            # Create a mock client for development
            self.client = None
    
    def get_usage(self, fingerprint: str) -> Dict[str, Any]:
        """Get usage data for a fingerprint"""
        if not self.client:
            return {
                "tiny_base_minutes_used": 0.0,
                "premium_minutes_used": 0.0,
                "is_paid": False,
                "email": None,
                "minutes": 0.0
            }
        data = self.client.get(f"usage:{fingerprint}")
        if data:
            usage = json.loads(data)
            # Ensure minute fields exist (for backward compatibility with old count-based data)
            if "tiny_base_minutes_used" not in usage:
                usage["tiny_base_minutes_used"] = 0.0
            if "premium_minutes_used" not in usage:
                usage["premium_minutes_used"] = 0.0
            return usage
        return {
            "tiny_base_minutes_used": 0.0,
            "premium_minutes_used": 0.0,
            "is_paid": False,
            "email": None,
            "minutes": 0.0
        }
    
    def find_usage_by_email(self, email: str) -> Optional[tuple[str, Dict[str, Any]]]:
        """Find usage data by email. Returns (fingerprint, usage_data) or None"""
        if not self.client:
            return None
        
        # Check if email is already mapped to a fingerprint
        mapped_fp = self.client.get(f"email_to_fingerprint:{email.lower()}")
        if mapped_fp:
            usage = self.get_usage(mapped_fp)
            if usage.get("email", "").lower() == email.lower():
                return (mapped_fp, usage)
        
        # Search all usage keys for matching email
        cursor = 0
        while True:
            cursor, keys = self.client.scan(cursor, match="usage:*", count=100)
            for key in keys:
                data = self.client.get(key)
                if data:
                    usage = json.loads(data)
                    if usage.get("email", "").lower() == email.lower():
                        fingerprint = key.replace("usage:", "")
                        return (fingerprint, usage)
            if cursor == 0:
                break
        
        return None
    
    def link_fingerprint_to_email(self, fingerprint: str, email: str) -> Dict[str, Any]:
        """Link a fingerprint to an email account and merge minutes"""
        if not self.client:
            return self.get_usage(fingerprint)
        
        email_lower = email.lower()
        current_usage = self.get_usage(fingerprint)
        
        # Find existing usage by email
        existing = self.find_usage_by_email(email_lower)
        
        if existing:
            existing_fp, existing_usage = existing
            
            # If already linked to this fingerprint, return current usage
            if existing_fp == fingerprint:
                return current_usage
            
            # Merge minutes and usage minutes
            merged_minutes = existing_usage.get("minutes", 0.0) + current_usage.get("minutes", 0.0)
            merged_tiny_base_minutes = max(
                existing_usage.get("tiny_base_minutes_used", 0.0),
                current_usage.get("tiny_base_minutes_used", 0.0)
            )
            merged_premium_minutes = max(
                existing_usage.get("premium_minutes_used", 0.0),
                current_usage.get("premium_minutes_used", 0.0)
            )
            
            # Update the existing fingerprint with merged data
            existing_usage["minutes"] = merged_minutes
            existing_usage["tiny_base_minutes_used"] = merged_tiny_base_minutes
            existing_usage["premium_minutes_used"] = merged_premium_minutes
            existing_usage["email"] = email_lower
            existing_usage["is_paid"] = True
            
            self.client.setex(
                f"usage:{existing_fp}",
                86400 * 365,
                json.dumps(existing_usage)
            )
            
            # Update current fingerprint to point to email account
            current_usage["email"] = email_lower
            current_usage["minutes"] = merged_minutes
            current_usage["tiny_base_minutes_used"] = merged_tiny_base_minutes
            current_usage["premium_minutes_used"] = merged_premium_minutes
            current_usage["is_paid"] = True
            
            self.client.setex(
                f"usage:{fingerprint}",
                86400 * 365,
                json.dumps(current_usage)
            )
            
            # Create email -> fingerprint mapping (use existing fingerprint as primary)
            self.client.setex(
                f"email_to_fingerprint:{email_lower}",
                86400 * 365,
                existing_fp
            )
            
            return existing_usage
        else:
            # No existing account, just link this fingerprint to email
            current_usage["email"] = email_lower
            current_usage["is_paid"] = True
            
            self.client.setex(
                f"usage:{fingerprint}",
                86400 * 365,
                json.dumps(current_usage)
            )
            
            # Create email -> fingerprint mapping
            self.client.setex(
                f"email_to_fingerprint:{email_lower}",
                86400 * 365,
                fingerprint
            )
            
            return current_usage
    
    def increment_usage(self, fingerprint: str, model: str, is_paid: bool = False, duration_seconds: float = 0.0):
        """Increment usage minutes for a fingerprint"""
        if not self.client:
            return
        usage = self.get_usage(fingerprint)
        
        duration_minutes = duration_seconds / 60.0
        
        if model in ["tiny", "base"]:
            usage["tiny_base_minutes_used"] = usage.get("tiny_base_minutes_used", 0.0) + duration_minutes
        elif model in ["small", "medium", "large"]:
            usage["premium_minutes_used"] = usage.get("premium_minutes_used", 0.0) + duration_minutes
        
        usage["is_paid"] = is_paid or usage.get("is_paid", False)
        
        self.client.setex(
            f"usage:{fingerprint}",
            86400 * 365,  # 1 year TTL
            json.dumps(usage)
        )
    
    def set_minutes(self, fingerprint: str, minutes: float, email: Optional[str] = None):
        """Set minutes balance for a fingerprint"""
        if not self.client:
            return
        usage = self.get_usage(fingerprint)
        usage["minutes"] = minutes
        if email:
            usage["email"] = email
            usage["is_paid"] = True
        
        self.client.setex(
            f"usage:{fingerprint}",
            86400 * 365,
            json.dumps(usage)
        )

    def add_minutes_by_email(self, email: str, minutes: float) -> float:
        """Add minutes to a pending bucket for an email (admin gift). Recipient claims via /minutes/claim."""
        if not self.client:
            return minutes
        key = f"usage:pending:{email.lower()}"
        data = self.client.get(key)
        if data:
            obj = json.loads(data)
        else:
            obj = {"minutes": 0.0, "email": email.lower()}
        obj["minutes"] = obj.get("minutes", 0.0) + minutes
        obj["email"] = email.lower()
        self.client.setex(key, 86400 * 365, json.dumps(obj))
        return obj["minutes"]

    def get_pending_minutes(self, email: str) -> Optional[Dict[str, Any]]:
        """Get pending minutes for an email, or None."""
        if not self.client:
            return None
        data = self.client.get(f"usage:pending:{email.lower()}")
        if not data:
            return None
        return json.loads(data)

    def merge_pending_into_fingerprint(self, fingerprint: str, email: str) -> Optional[Dict[str, Any]]:
        """If pending minutes exist for email, merge into usage:{fingerprint}, delete pending, set email_to_fingerprint. Returns merged usage or None."""
        if not self.client:
            return None
        pending = self.get_pending_minutes(email.lower())
        if not pending:
            return None
        current = self.get_usage(fingerprint)
        merged_minutes = pending.get("minutes", 0.0) + current.get("minutes", 0.0)
        merged = {
            "minutes": merged_minutes,
            "email": email.lower(),
            "is_paid": True,
            "tiny_base_minutes_used": current.get("tiny_base_minutes_used", 0.0),
            "premium_minutes_used": current.get("premium_minutes_used", 0.0),
        }
        self.client.setex(f"usage:{fingerprint}", 86400 * 365, json.dumps(merged))
        self.client.setex(f"email_to_fingerprint:{email.lower()}", 86400 * 365, fingerprint)
        self.client.delete(f"usage:pending:{email.lower()}")
        return merged
    
    def deduct_minutes(self, fingerprint: str, amount: float) -> bool:
        """Deduct minutes, returns True if successful"""
        if not self.client:
            return True  # Allow in dev mode
        usage = self.get_usage(fingerprint)
        current_minutes = usage.get("minutes", 0.0)
        
        if current_minutes < amount:
            return False
        
        usage["minutes"] = current_minutes - amount
        self.client.setex(
            f"usage:{fingerprint}",
            86400 * 365,
            json.dumps(usage)
        )
        return True
    
    def store_job_metadata(self, job_id: str, metadata: Dict[str, Any], ttl: int = 604800):
        """Store job metadata with TTL (default 7 days)"""
        if not self.client:
            return
        self.client.setex(
            f"job:{job_id}",
            ttl,
            json.dumps(metadata)
        )
    
    def get_job_metadata(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job metadata"""
        if not self.client:
            return None
        data = self.client.get(f"job:{job_id}")
        if data:
            return json.loads(data)
        return None
    
    def update_job_progress(self, job_id: str, progress: float, elapsed_time: float, estimated_total_time: float):
        """Update job progress metadata"""
        if not self.client:
            return
        
        metadata = self.get_job_metadata(job_id)
        if metadata:
            # Don't overwrite status if it's already completed or failed
            current_status = metadata.get("status")
            if current_status not in ["completed", "failed"]:
                metadata["status"] = "processing"
            metadata["progress"] = progress
            metadata["elapsed_time"] = elapsed_time
            metadata["estimated_total_time"] = estimated_total_time
            metadata["time_remaining"] = max(0, estimated_total_time - elapsed_time)
            
            # Get TTL to preserve it
            ttl = self.client.ttl(f"job:{job_id}")
            if ttl > 0:
                self.client.setex(
                    f"job:{job_id}",
                    ttl,
                    json.dumps(metadata)
                )
            else:
                # Default TTL if not set
                self.client.setex(
                    f"job:{job_id}",
                    604800,  # 7 days
                    json.dumps(metadata)
                )
    
    def set_job_first_downloaded_at(self, job_id: str, timestamp: float) -> None:
        """Set first_downloaded_at on job metadata if not already set. Preserves TTL."""
        if not self.client:
            return
        meta = self.get_job_metadata(job_id)
        if not meta or meta.get("first_downloaded_at") is not None:
            return
        meta["first_downloaded_at"] = timestamp
        ttl = self.client.ttl(f"job:{job_id}") or 604800
        self.client.setex(f"job:{job_id}", ttl, json.dumps(meta))

    def get_jobs_with_first_download_elapsed(self, elapsed_seconds: float = 300) -> List[Tuple[str, str]]:
        """Jobs where first_downloaded_at is set and >= elapsed_seconds ago. Returns [(job_id, fingerprint), ...]."""
        if not self.client:
            return []
        out: List[Tuple[str, str]] = []
        now = time.time()
        for key in self.client.scan_iter("job:*"):
            data = self.client.get(key)
            if not data:
                continue
            try:
                meta = json.loads(data)
            except Exception:
                continue
            fd = meta.get("first_downloaded_at")
            if fd is None:
                continue
            if (now - fd) >= elapsed_seconds:
                job_id = key.replace("job:", "")
                fp = meta.get("fingerprint")
                if fp:
                    out.append((job_id, fp))
        return out

    def set_rate_limit(self, key: str, limit: int, window: int):
        """Set rate limit counter"""
        if not self.client:
            return True  # Allow in dev mode
        current = self.client.incr(f"ratelimit:{key}")
        if current == 1:
            self.client.expire(f"ratelimit:{key}", window)
        return current <= limit
