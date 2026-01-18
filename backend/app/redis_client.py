import redis
import os
import json
from typing import Optional, Dict, Any


class RedisClient:
    def __init__(self):
        redis_url = os.getenv("REDIS_URL")
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
                "tiny_base_count": 0,
                "small_count": 0,
                "is_paid": False,
                "email": None,
                "credits": 0.0
            }
        data = self.client.get(f"usage:{fingerprint}")
        if data:
            return json.loads(data)
        return {
            "tiny_base_count": 0,
            "small_count": 0,
            "is_paid": False,
            "email": None,
            "credits": 0.0
        }
    
    def increment_usage(self, fingerprint: str, model: str, is_paid: bool = False):
        """Increment usage counter for a fingerprint"""
        if not self.client:
            return
        usage = self.get_usage(fingerprint)
        
        if model in ["tiny", "base"]:
            usage["tiny_base_count"] = usage.get("tiny_base_count", 0) + 1
        elif model == "small":
            usage["small_count"] = usage.get("small_count", 0) + 1
        
        usage["is_paid"] = is_paid or usage.get("is_paid", False)
        
        self.client.setex(
            f"usage:{fingerprint}",
            86400 * 365,  # 1 year TTL
            json.dumps(usage)
        )
    
    def set_credits(self, fingerprint: str, credits: float, email: Optional[str] = None):
        """Set credit balance for a fingerprint"""
        if not self.client:
            return
        usage = self.get_usage(fingerprint)
        usage["credits"] = credits
        if email:
            usage["email"] = email
            usage["is_paid"] = True
        
        self.client.setex(
            f"usage:{fingerprint}",
            86400 * 365,
            json.dumps(usage)
        )
    
    def deduct_credits(self, fingerprint: str, amount: float) -> bool:
        """Deduct credits, returns True if successful"""
        if not self.client:
            return True  # Allow in dev mode
        usage = self.get_usage(fingerprint)
        current_credits = usage.get("credits", 0.0)
        
        if current_credits < amount:
            return False
        
        usage["credits"] = current_credits - amount
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
    
    def set_rate_limit(self, key: str, limit: int, window: int):
        """Set rate limit counter"""
        if not self.client:
            return True  # Allow in dev mode
        current = self.client.incr(f"ratelimit:{key}")
        if current == 1:
            self.client.expire(f"ratelimit:{key}", window)
        return current <= limit
