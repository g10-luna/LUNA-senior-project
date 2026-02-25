"""
LUNA Auth Service - FastAPI application.
Base path: /api/v1/auth
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

# Load .env FIRST, before any other imports that use env vars
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=True)

from fastapi import FastAPI

from auth.routes import router as auth_router


def _validate_startup():
    """Validate required env and services at startup. Raises clear errors."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
    try:
        from shared.redis_client import get_redis
        get_redis().ping()
    except Exception as e:
        raise RuntimeError(
            "Redis is not running. Start it with: cd backend/docker && docker compose up -d"
        ) from e


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

app.include_router(auth_router)


@app.get("/")
def root():
    """Health check."""
    return {"service": "auth", "status": "running"}


@app.get("/health")
def health():
    """Health check."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
