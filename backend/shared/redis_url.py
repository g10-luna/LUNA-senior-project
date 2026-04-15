"""Helpers for Redis URLs (Upstash, local Docker, etc.)."""
from __future__ import annotations

from urllib.parse import urlparse, urlunparse


def normalize_upstash_redis_url(url: str) -> str:
    """
    Upstash Redis only supports logical DB 0. URLs like .../1 or .../2 fail with:
    "Only 0th database is supported! Selected DB: 1."
    """
    if not url.startswith("rediss://"):
        return url
    parsed = urlparse(url)
    if parsed.path in ("", "/"):
        return urlunparse(parsed._replace(path="/0"))
    suffix = parsed.path.lstrip("/")
    if suffix.isdigit() and suffix != "0":
        return urlunparse(parsed._replace(path="/0"))
    return url
