"""
Celery application for asynchronous tasks/events.
"""
from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from celery import Celery
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)


def _celery_rediss_url(url: str) -> str:
    """Celery/kombu require ssl_cert_reqs on rediss:// broker and result URLs."""
    if not url.startswith("rediss://"):
        return url
    parsed = urlparse(url)
    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    if any(k.lower() == "ssl_cert_reqs" for k, _ in pairs):
        return url
    pairs = [*pairs, ("ssl_cert_reqs", "CERT_REQUIRED")]
    return urlunparse(parsed._replace(query=urlencode(pairs)))


broker_url = _celery_rediss_url(os.getenv("REDIS_CELERY_BROKER_URL", "redis://redis:6379/1"))
_raw_backend = os.getenv("REDIS_CELERY_RESULT_BACKEND") or os.getenv("REDIS_CELERY_BROKER_URL", "redis://redis:6379/1")
result_backend = _celery_rediss_url(_raw_backend)

celery_app = Celery(
    "luna",
    broker=broker_url,
    backend=result_backend,
    include=[],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

