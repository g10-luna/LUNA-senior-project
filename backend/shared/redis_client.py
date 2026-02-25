"""
Redis client for token storage and cache.
"""
import os
from redis import Redis

from dotenv import load_dotenv

load_dotenv()

_redis: Redis | None = None

# Redis key prefixes
REFRESH_TOKEN_PREFIX = "refresh_token:"
REFRESH_TOKEN_TTL = 7 * 24 * 3600  # 7 days


def get_redis() -> Redis:
    """Get Redis client. Requires REDIS_URL in env."""
    global _redis
    if _redis is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis = Redis.from_url(url, decode_responses=True)
    return _redis


def store_refresh_token(user_id: str, refresh_token: str) -> None:
    """Store refresh token in Redis for invalidation on logout."""
    r = get_redis()
    key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
    r.setex(key, REFRESH_TOKEN_TTL, refresh_token)


def is_refresh_token_valid(user_id: str, refresh_token: str) -> bool:
    """Check if refresh token is still valid (not invalidated by logout)."""
    r = get_redis()
    key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
    stored = r.get(key)
    return stored == refresh_token if stored else False


def invalidate_refresh_token(user_id: str) -> None:
    """Invalidate refresh token on logout."""
    r = get_redis()
    key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
    r.delete(key)
