"""CORS for API services (browser clients e.g. Vercel). Set CORS_ALLOW_ORIGINS in env."""
from __future__ import annotations

import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware


def add_cors(app: FastAPI) -> None:
    raw = (os.getenv("CORS_ALLOW_ORIGINS") or "*").strip()
    if raw == "*":
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        return
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        origins = ["*"]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        return
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
