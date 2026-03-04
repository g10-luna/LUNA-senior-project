"""
Redis client for token storage and cache.
"""
import os
from typing import Iterator

from redis import Redis

from dotenv import load_dotenv

load_dotenv()

_redis: Redis | None = None

# Redis key prefixes
REFRESH_TOKEN_PREFIX = "refresh_token:"
REFRESH_TOKEN_TTL = 7 * 24 * 3600  # 7 days
CACHE_PREFIX = "cache:"


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


def cache_get(key: str) -> str | None:
    """Get a cached string value by key."""
    r = get_redis()
    return r.get(f"{CACHE_PREFIX}{key}")


def cache_set(key: str, value: str, ttl_seconds: int) -> None:
    """Set a cached string value with TTL."""
    r = get_redis()
    r.setex(f"{CACHE_PREFIX}{key}", ttl_seconds, value)


def cache_delete_prefix(prefix: str) -> int:
    """Delete cache entries matching prefix; returns deleted count."""
    r = get_redis()
    pattern = f"{CACHE_PREFIX}{prefix}*"
    keys: list[str] = list(_scan_keys(r, pattern))
    if not keys:
        return 0
    return int(r.delete(*keys))


def _scan_keys(r: Redis, pattern: str) -> Iterator[str]:
    for key in r.scan_iter(match=pattern, count=500):
        if isinstance(key, bytes):
            yield key.decode("utf-8")
        else:
            yield str(key)
