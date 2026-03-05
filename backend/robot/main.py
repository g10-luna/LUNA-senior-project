"""
LUNA Robot Service - FastAPI application.
Base path: /api/v1/robot
"""
from fastapi import FastAPI

app = FastAPI(
    title="LUNA Robot Service",
    description="Robot integration and task service",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"service": "robot", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/v1/robot")
def robot_root():
    return {"service": "robot", "base_path": "/api/v1/robot"}


@app.get("/api/v1/robot/health")
def robot_health():
    return {"status": "healthy"}

