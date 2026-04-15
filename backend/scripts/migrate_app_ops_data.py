#!/usr/bin/env python3
"""
Copy app + ops row data from local Docker Postgres into Supabase.

Reads TARGET from backend/.env: DATABASE_URL_SYNC (normalizes postgresql+asyncpg -> postgresql for psql).

Source: prefers `docker exec luna-postgres pg_dump` when the container exists (avoids host :5432 conflicts).
         Otherwise set SOURCE_DATABASE_URL to a postgresql:// URI.

Usage (from backend/):
  python3 scripts/migrate_app_ops_data.py

Requires: Docker (for default source), psql, pg_dump in PATH; target must already have schema (alembic upgrade head).
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv


def strip_pg17_restrict_meta(path: Path) -> None:
    """pg_dump from PG17+ emits \\restrict/\\unrestrict; older psql rejects them."""
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = [
        ln
        for ln in text.splitlines()
        if not (ln.startswith("\\restrict") or ln.startswith("\\unrestrict"))
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def sync_url_for_psql(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


def dump_from_docker(dump_path: Path) -> None:
    container = "luna-postgres"
    inner = "/tmp/luna_app_ops.sql"
    cmd = [
        "docker",
        "exec",
        container,
        "pg_dump",
        "-U",
        "luna_user",
        "-d",
        "luna_db",
        "--data-only",
        "--schema=app",
        "--schema=ops",
        "--no-owner",
        "--no-privileges",
        "-f",
        inner,
    ]
    print("Dumping from Docker container", container, "...")
    subprocess.run(cmd, check=True)
    subprocess.run(["docker", "cp", f"{container}:{inner}", str(dump_path)], check=True)
    subprocess.run(["docker", "exec", container, "rm", "-f", inner], check=False)


def dump_from_url(source_url: str, dump_path: Path) -> None:
    print("Dumping from SOURCE_DATABASE_URL ...")
    subprocess.run(
        [
            "pg_dump",
            source_url,
            "--data-only",
            "--schema=app",
            "--schema=ops",
            "--no-owner",
            "--no-privileges",
            "-f",
            str(dump_path),
        ],
        check=True,
    )


def main() -> int:
    backend_dir = Path(__file__).resolve().parent.parent
    load_dotenv(backend_dir / ".env")

    target = os.getenv("DATABASE_URL_SYNC", "").strip()
    if not target:
        print("DATABASE_URL_SYNC missing in backend/.env", file=sys.stderr)
        return 1

    target_psql = sync_url_for_psql(target)
    if not target_psql.startswith("postgresql://"):
        print("DATABASE_URL_SYNC must be a postgresql:// or postgresql+asyncpg:// URI", file=sys.stderr)
        return 1

    dump_path = Path(os.environ.get("TMPDIR", "/tmp")) / "luna_app_ops_data.sql"

    # Detect docker source
    check = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", "luna-postgres"],
        capture_output=True,
        text=True,
    )
    use_docker = check.returncode == 0 and check.stdout.strip() == "true"

    if use_docker:
        dump_from_docker(dump_path)
    else:
        source = os.getenv("SOURCE_DATABASE_URL", "").strip()
        if not source:
            print(
                "luna-postgres not running; set SOURCE_DATABASE_URL=postgresql://... for your source DB",
                file=sys.stderr,
            )
            return 1
        dump_from_url(source, dump_path)

    strip_pg17_restrict_meta(dump_path)

    print("Applying to Supabase (psql) ...")
    try:
        subprocess.run(
            ["psql", target_psql, "-v", "ON_ERROR_STOP=1", "-f", str(dump_path)],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(
            "\nIf you see duplicate key errors, tables on Supabase may already have rows. "
            "Truncate app/ops data (careful) or skip existing keys.",
            file=sys.stderr,
        )
        return e.returncode
    finally:
        dump_path.unlink(missing_ok=True)

    print("Done. Check Supabase Table Editor → schemas app / ops.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
