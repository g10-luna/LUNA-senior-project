"""
LUNA Auth Service - FastAPI application.
Base path: /api/v1/auth
"""
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

# Load .env FIRST, before any other imports that use env vars
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=False)

from fastapi import FastAPI

from auth.routes import router as auth_router
from shared.cors import add_cors
from shared.env_bootstrap import ensure_local_jwt_secret


def _validate_startup():
    """Validate required env and services at startup. Raises clear errors."""
    ensure_local_jwt_secret(_env_path)

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
    # Retry: on container restart, Docker DNS may not resolve `redis` for a short window.
    from shared.redis_client import get_redis, reset_redis_client

    last_err: Exception | None = None
    for attempt in range(30):
        try:
            get_redis().ping()
            return
        except Exception as e:
            last_err = e
            reset_redis_client()
            if attempt < 29:
                time.sleep(0.5)
    raise RuntimeError(
        "Redis is not reachable at REDIS_URL. In Docker use redis://redis:6379/0, "
        "then: cd backend/docker && docker compose up -d && docker compose restart auth-service"
    ) from last_err


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_startup()
    yield


app = FastAPI(
    title="LUNA Auth Service",
    description="Authentication Service - register, login, JWT, RBAC",
    version="0.1.0",
    lifespan=lifespan,
)

add_cors(app)

app.include_router(auth_router)


@app.get("/")
def root():
    """Health check."""
    return {"service": "auth", "status": "running"}


@app.get("/health")
def health():
    """Health check."""
    return {"status": "healthy"}


@app.get("/api/v1/auth/health")
def auth_health():
    """Auth API path health check."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
