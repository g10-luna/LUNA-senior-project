"""
Authentication Service - Simple Hello API
This is a minimal FastAPI application to demonstrate service startup.
Full implementation will follow the Backend Implementation Design.
"""
from fastapi import FastAPI

app = FastAPI(
    title="LUNA Auth Service",
    description="Authentication Service for LUNA",
    version="0.1.0"
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"service": "auth", "status": "running", "message": "Hello from Auth Service"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
