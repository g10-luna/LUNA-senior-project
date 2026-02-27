"""
Environment bootstrap helpers for local development.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv


def ensure_local_jwt_secret(env_path: Path) -> None:
    """
    Ensure JWT_SECRET_KEY is set.

    Behavior:
    - In development: generate and persist a random key if missing/placeholder.
    - In non-development environments: raise if missing/placeholder.
    """
    load_dotenv(env_path, override=False)

    env_name = os.getenv("ENVIRONMENT", "development").strip().lower()
    jwt_secret = (os.getenv("JWT_SECRET_KEY") or "").strip()
    placeholder_values = {
        "",
        "CHANGE_THIS_TO_A_SECURE_RANDOM_STRING",
        "JWT_SECRET_KEY_PLACEHOLDER",
    }

    if jwt_secret not in placeholder_values:
        return

    if env_name != "development":
        raise RuntimeError("JWT_SECRET_KEY must be set for non-development environments")

    generated = secrets.token_urlsafe(48)
    os.environ["JWT_SECRET_KEY"] = generated

    env_path.parent.mkdir(parents=True, exist_ok=True)
    if not env_path.exists():
        env_path.write_text("", encoding="utf-8")

    existing = env_path.read_text(encoding="utf-8")
    if "JWT_SECRET_KEY=" in existing:
        updated_lines = []
        for line in existing.splitlines():
            if line.startswith("JWT_SECRET_KEY="):
                updated_lines.append(f"JWT_SECRET_KEY={generated}")
            else:
                updated_lines.append(line)
        env_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
    else:
        suffix = "\n" if existing and not existing.endswith("\n") else ""
        env_path.write_text(
            existing + suffix + f"JWT_SECRET_KEY={generated}\n",
            encoding="utf-8",
        )

