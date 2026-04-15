"""
LUNA Book Service - FastAPI application.
Base path: /api/v1/books
"""
from fastapi import FastAPI

from book.routes import router as book_router
from shared.cors import add_cors

app = FastAPI(
    title="LUNA Book Service",
    description="Book catalog service",
    version="0.1.0",
)

add_cors(app)

app.include_router(book_router)


@app.get("/")
def root():
    return {"service": "book", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


