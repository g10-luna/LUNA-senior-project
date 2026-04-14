"""
LUNA Delivery Service - FastAPI application.
Base path: /api/v1/requests, /api/v1/returns, /api/v1/deliveries
"""
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=False)

from fastapi import FastAPI

from delivery.routes import deliveries_router, requests_router, returns_router


app = FastAPI(
    title="LUNA Delivery Service",
    description="Book requests, book returns, and delivery tasks",
    version="0.3.0",
)

app.include_router(requests_router)
app.include_router(returns_router)
app.include_router(deliveries_router)


@app.get("/")
def root():
    return {"service": "delivery", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
