"""
LUNA Delivery Service - FastAPI application.
Base path: /api/v1/requests, /api/v1/returns, /api/v1/deliveries
"""
from fastapi import FastAPI

app = FastAPI(
    title="LUNA Delivery Service",
    description="Delivery workflow service",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"service": "delivery", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/v1/deliveries")
def deliveries_root():
    return {"service": "delivery", "base_path": "/api/v1/deliveries"}


@app.get("/api/v1/deliveries/health")
def deliveries_health():
    return {"status": "healthy"}


@app.get("/api/v1/requests/health")
def requests_health():
    return {"status": "healthy"}


@app.get("/api/v1/returns/health")
def returns_health():
    return {"status": "healthy"}

