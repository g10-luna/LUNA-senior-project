"""
LUNA Book Service - FastAPI application.
Base path: /api/v1/books
"""
from fastapi import FastAPI

app = FastAPI(
    title="LUNA Book Service",
    description="Book catalog service",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"service": "book", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/v1/books")
def books_root():
    return {"service": "book", "base_path": "/api/v1/books"}


@app.get("/api/v1/books/health")
def books_health():
    return {"status": "healthy"}

