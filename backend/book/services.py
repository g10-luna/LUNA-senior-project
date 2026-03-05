"""
Business logic layer for Book Service.
"""
from __future__ import annotations

import logging
import json
import time
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from shared.db import SessionLocal
from shared.models import AuditLog, Book, BookStatus
from shared.redis_client import cache_delete_prefix, cache_get, cache_set

from book import repository
from book.import_openlibrary import (
    DEFAULT_SUBJECTS,
    ImportStats,
    import_open_library,
    normalize_isbn,
)

logger = logging.getLogger(__name__)


class BookServiceError(Exception):
    pass


class BookNotFoundError(BookServiceError):
    pass


class BookConflictError(BookServiceError):
    pass


@dataclass
class BookListResult:
    items: list
    total: int
    page: int
    limit: int


@dataclass
class PerfBaselineResult:
    iterations: int
    limit: int
    avg_ms: float
    min_ms: float
    max_ms: float
    p95_ms: float


def _book_cache_get(key: str):
    raw = cache_get(f"book:{key}")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _book_cache_set(key: str, value, ttl_seconds: int) -> None:
    try:
        cache_set(f"book:{key}", json.dumps(value), ttl_seconds)
    except Exception:
        logger.exception("Book cache set failed for key=%s", key)


def invalidate_book_caches() -> None:
    """Best-effort cache invalidation for book-domain reads."""
    try:
        cache_delete_prefix("book:")
    except Exception:
        logger.exception("Book cache invalidation failed")


def log_audit_event(
    *,
    actor_user_id: UUID | None,
    action: str,
    resource_type: str,
    resource_id: UUID | None,
    changes: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Best-effort audit logging for book-domain write/maintenance actions.
    Failures are logged but do not fail the caller operation.
    """
    db = SessionLocal()
    try:
        db.add(
            AuditLog(
                user_id=actor_user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                changes=changes,
                ip_address=ip_address,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Audit log write failed action=%s resource_type=%s resource_id=%s",
            action,
            resource_type,
            resource_id,
        )
    finally:
        db.close()


def _validate_publication_year(year: int | None) -> None:
    if year is None:
        return
    current_year = datetime.now().year + 1
    if year < 1400 or year > current_year:
        raise BookServiceError("publication_year must be between 1400 and current year + 1")


def list_books(
    *,
    page: int,
    limit: int,
    sort: str,
    order: str,
    status: BookStatus | None,
    author: str | None,
    publisher: str | None,
    year: int | None,
    q: str | None,
) -> BookListResult:
    _validate_publication_year(year)
    db = SessionLocal()
    try:
        items, total = repository.list_books(
            db,
            page=page,
            limit=limit,
            sort=sort,
            order=order,
            status=status,
            author=author,
            publisher=publisher,
            year=year,
            q=q,
        )
        return BookListResult(items=list(items), total=total, page=page, limit=limit)
    finally:
        db.close()


def get_book(book_id: UUID):
    db = SessionLocal()
    try:
        book = repository.get_book_by_id(db, book_id)
        if not book:
            raise BookNotFoundError("Book not found")
        return book
    finally:
        db.close()


def get_book_by_isbn(isbn: str):
    db = SessionLocal()
    try:
        book = repository.get_book_by_isbn(db, isbn)
        if not book:
            raise BookNotFoundError("Book not found")
        return book
    finally:
        db.close()


def create_book(
    *,
    isbn: str,
    title: str,
    author: str,
    publisher: str | None,
    publication_year: int | None,
    description: str | None,
    cover_image_url: str | None,
    status: BookStatus,
    shelf_location: str | None,
):
    _validate_publication_year(publication_year)
    db = SessionLocal()
    try:
        existing = repository.get_book_by_isbn(db, isbn)
        if existing:
            raise BookConflictError("A book with this ISBN already exists")

        book = repository.create_book(
            db,
            isbn=isbn,
            title=title,
            author=author,
            publisher=publisher,
            publication_year=publication_year,
            description=description,
            cover_image_url=cover_image_url,
            status=status,
            shelf_location=shelf_location,
        )
        db.commit()
        return book
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def update_book(
    *,
    book_id: UUID,
    isbn: str,
    title: str,
    author: str,
    publisher: str | None,
    publication_year: int | None,
    description: str | None,
    cover_image_url: str | None,
    status: BookStatus,
    shelf_location: str | None,
):
    _validate_publication_year(publication_year)
    db = SessionLocal()
    try:
        book = repository.get_book_by_id(db, book_id)
        if not book:
            raise BookNotFoundError("Book not found")

        conflict = repository.get_book_by_isbn(db, isbn)
        if conflict and conflict.id != book.id:
            raise BookConflictError("A book with this ISBN already exists")

        updated = repository.update_book(
            db,
            book=book,
            isbn=isbn,
            title=title,
            author=author,
            publisher=publisher,
            publication_year=publication_year,
            description=description,
            cover_image_url=cover_image_url,
            status=status,
            shelf_location=shelf_location,
        )
        db.commit()
        return updated
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def update_book_status(*, book_id: UUID, status: BookStatus):
    db = SessionLocal()
    try:
        book = repository.get_book_by_id(db, book_id)
        if not book:
            raise BookNotFoundError("Book not found")
        updated = repository.update_book_status(db, book=book, status=status)
        db.commit()
        return updated
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def delete_book(*, book_id: UUID):
    db = SessionLocal()
    try:
        book = repository.get_book_by_id(db, book_id)
        if not book:
            raise BookNotFoundError("Book not found")
        refs = repository.count_book_references(db, book_id=book_id)
        if refs > 0:
            raise BookConflictError("Book cannot be deleted because it has related requests/returns")
        repository.delete_book(db, book=book)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def import_books_from_open_library(
    *,
    subjects: list[str],
    pages_per_subject: int,
    limit: int,
    sleep_seconds: float,
    dry_run: bool,
    max_books: int | None,
) -> ImportStats:
    clean_subjects = [s.strip() for s in subjects if s.strip()]
    if not clean_subjects:
        clean_subjects = list(DEFAULT_SUBJECTS)

    try:
        return import_open_library(
            subjects=clean_subjects,
            pages_per_subject=pages_per_subject,
            limit=limit,
            sleep_seconds=sleep_seconds,
            dry_run=dry_run,
            max_books=max_books,
        )
    except Exception as exc:
        raise BookServiceError(f"Open Library import failed: {exc}") from exc


def get_book_catalog_stats() -> dict[str, int]:
    cached = _book_cache_get("catalog_stats")
    if cached is not None:
        return cached
    db = SessionLocal()
    try:
        value = repository.get_catalog_stats(db)
        _book_cache_set("catalog_stats", value, ttl_seconds=120)
        return value
    finally:
        db.close()


def get_related_books(*, book_id: UUID, limit: int):
    db = SessionLocal()
    try:
        book = repository.get_book_by_id(db, book_id)
        if not book:
            raise BookNotFoundError("Book not found")
        return list(repository.get_related_books(db, book=book, limit=limit))
    finally:
        db.close()


def get_random_discovery_books(*, limit: int):
    db = SessionLocal()
    try:
        return list(repository.get_random_available_books(db, limit=limit))
    finally:
        db.close()


def get_top_authors(*, limit: int) -> list[tuple[str, int]]:
    cache_key = f"top_authors:{limit}"
    cached = _book_cache_get(cache_key)
    if cached is not None:
        return [(item[0], int(item[1])) for item in cached]
    db = SessionLocal()
    try:
        value = repository.get_top_authors(db, limit=limit)
        _book_cache_set(cache_key, value, ttl_seconds=300)
        return value
    finally:
        db.close()


def get_top_publishers(*, limit: int) -> list[tuple[str, int]]:
    cache_key = f"top_publishers:{limit}"
    cached = _book_cache_get(cache_key)
    if cached is not None:
        return [(item[0], int(item[1])) for item in cached]
    db = SessionLocal()
    try:
        value = repository.get_top_publishers(db, limit=limit)
        _book_cache_set(cache_key, value, ttl_seconds=300)
        return value
    finally:
        db.close()


def get_top_publication_years(*, limit: int) -> list[tuple[int, int]]:
    cache_key = f"top_years:{limit}"
    cached = _book_cache_get(cache_key)
    if cached is not None:
        return [(int(item[0]), int(item[1])) for item in cached]
    db = SessionLocal()
    try:
        value = repository.get_top_publication_years(db, limit=limit)
        _book_cache_set(cache_key, value, ttl_seconds=300)
        return value
    finally:
        db.close()


def get_search_suggestions(*, q: str, limit: int) -> list[tuple[str, str]]:
    db = SessionLocal()
    try:
        clean_q = q.strip()
        if not clean_q:
            return []
        return repository.get_search_suggestions(db, q=clean_q, limit=limit)
    finally:
        db.close()


def get_filter_options(*, limit: int) -> dict[str, list]:
    cache_key = f"filter_options:{limit}"
    cached = _book_cache_get(cache_key)
    if cached is not None:
        return cached
    db = SessionLocal()
    try:
        value = repository.get_filter_options(db, limit=limit)
        _book_cache_set(cache_key, value, ttl_seconds=300)
        return value
    finally:
        db.close()


def get_coverage() -> dict[str, float | int]:
    cached = _book_cache_get("coverage")
    if cached is not None:
        return cached
    db = SessionLocal()
    try:
        counts = repository.get_coverage_stats(db)
    finally:
        db.close()

    total = counts["total_books"] or 0
    if total == 0:
        return {
            **counts,
            "with_cover_percent": 0.0,
            "with_publication_year_percent": 0.0,
            "with_description_percent": 0.0,
        }

    value = {
        **counts,
        "with_cover_percent": round((counts["with_cover_count"] / total) * 100, 2),
        "with_publication_year_percent": round(
            (counts["with_publication_year_count"] / total) * 100, 2
        ),
        "with_description_percent": round(
            (counts["with_description_count"] / total) * 100, 2
        ),
    }
    _book_cache_set("coverage", value, ttl_seconds=120)
    return value


def normalize_catalog_isbns(
    *,
    dry_run: bool,
    limit: int,
) -> dict[str, int | bool]:
    db = SessionLocal()
    scanned = 0
    updated = 0
    skipped_invalid = 0
    skipped_conflict = 0
    try:
        books = db.query(Book).order_by(Book.updated_at.desc()).limit(limit).all()
        for book in books:
            scanned += 1
            normalized = normalize_isbn(book.isbn)
            if not normalized:
                skipped_invalid += 1
                continue
            if normalized == book.isbn:
                continue

            conflict = repository.get_book_by_isbn(db, normalized)
            if conflict and conflict.id != book.id:
                skipped_conflict += 1
                continue

            if not dry_run:
                book.isbn = normalized
            updated += 1

        if not dry_run:
            db.commit()
    except Exception:
        if not dry_run:
            db.rollback()
        raise
    finally:
        db.close()

    return {
        "scanned": scanned,
        "updated": updated,
        "skipped_invalid": skipped_invalid,
        "skipped_conflict": skipped_conflict,
        "dry_run": dry_run,
    }


def run_perf_baseline(*, iterations: int, limit: int) -> PerfBaselineResult:
    """Measure list query latency (ms) under current dataset/indexes."""
    timings_ms: list[float] = []
    for _ in range(iterations):
        start = time.perf_counter()
        list_books(
            page=1,
            limit=limit,
            sort="title",
            order="asc",
            status=None,
            author=None,
            publisher=None,
            year=None,
            q=None,
        )
        elapsed = (time.perf_counter() - start) * 1000
        timings_ms.append(elapsed)

    timings_ms.sort()
    avg_ms = round(sum(timings_ms) / len(timings_ms), 2)
    p95_index = max(0, int(round(0.95 * len(timings_ms))) - 1)
    return PerfBaselineResult(
        iterations=iterations,
        limit=limit,
        avg_ms=avg_ms,
        min_ms=round(timings_ms[0], 2),
        max_ms=round(timings_ms[-1], 2),
        p95_ms=round(timings_ms[p95_index], 2),
    )
