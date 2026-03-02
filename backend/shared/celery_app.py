"""
Celery application for asynchronous tasks/events.
"""
from __future__ import annotations

import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)

broker_url = os.getenv("REDIS_CELERY_BROKER_URL", "redis://redis:6379/1")
result_backend = os.getenv("REDIS_CELERY_BROKER_URL", "redis://redis:6379/1")

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

