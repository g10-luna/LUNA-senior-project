"""
LUNA Notification Service - FastAPI application.
Base path: /api/v1/notifications
"""
from fastapi import FastAPI

app = FastAPI(
    title="LUNA Notification Service",
    description="Notifications and real-time event service",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"service": "notification", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/v1/notifications")
def notifications_root():
    return {"service": "notification", "base_path": "/api/v1/notifications"}


@app.get("/api/v1/notifications/health")
def notifications_health():
    return {"status": "healthy"}

