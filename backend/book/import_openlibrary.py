"""
Import books from Open Library Search API into app.books.

Usage examples:
  python -m book.import_openlibrary --dry-run
  python -m book.import_openlibrary --subjects "science_fiction,history" --pages-per-subject 5
"""
from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable
from urllib.parse import urlencode
from urllib.request import urlopen

from shared.db import SessionLocal
from shared.models import Book, BookStatus

OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
OPEN_LIBRARY_FIELDS = "key,title,author_name,first_publish_year,isbn,publisher,cover_i"
DEFAULT_SUBJECTS = [
    "science_fiction",
    "history",
    "computer_science",
    "mathematics",
    "biography",
]


@dataclass
class ImportStats:
    fetched_docs: int = 0
    inserted: int = 0
    skipped_missing_required: int = 0
    skipped_invalid_isbn: int = 0
    skipped_duplicate_isbn: int = 0
    skipped_invalid_year: int = 0
    failed_requests: int = 0


def normalize_isbn(raw: str | None) -> str | None:
    if not raw:
        return None
    value = re.sub(r"[^0-9Xx]", "", raw).upper()
    if len(value) in (10, 13):
        return value
    return None


def pick_isbn(candidates: Iterable[str] | None) -> str | None:
    if not candidates:
        return None
    normalized = [normalize_isbn(c) for c in candidates]
    normalized = [n for n in normalized if n is not None]
    if not normalized:
        return None
    # Prefer ISBN-13 when available.
    for n in normalized:
        if len(n) == 13:
            return n
    return normalized[0]


def fetch_subject_page(subject: str, page: int, limit: int) -> dict:
    query = urlencode(
        {
            "subject": subject,
            "page": page,
            "limit": limit,
            "fields": OPEN_LIBRARY_FIELDS,
        }
    )
    url = f"{OPEN_LIBRARY_SEARCH_URL}?{query}"
    with urlopen(url, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def map_doc_to_book_fields(doc: dict) -> dict | None:
    isbn = pick_isbn(doc.get("isbn"))
    if not isbn:
        return None

    title = (doc.get("title") or "").strip()
    author_names = doc.get("author_name") or []
    author = (author_names[0] if author_names else "").strip()
    if not title or not author:
        return None

    publisher_names = doc.get("publisher") or []
    publisher = (publisher_names[0] if publisher_names else None)
    if publisher is not None:
        publisher = publisher.strip() or None

    publication_year = doc.get("first_publish_year")
    if publication_year is not None:
        current_year = datetime.now().year + 1
        if not (1400 <= int(publication_year) <= current_year):
            publication_year = None

    cover_i = doc.get("cover_i")
    cover_image_url = (
        f"https://covers.openlibrary.org/b/id/{cover_i}-L.jpg" if cover_i else None
    )

    return {
        "isbn": isbn,
        "title": title,
        "author": author,
        "publisher": publisher,
        "publication_year": publication_year,
        "description": None,
        "cover_image_url": cover_image_url,
        "status": BookStatus.AVAILABLE,
        "shelf_location": None,
    }


def import_open_library(
    *,
    subjects: list[str],
    pages_per_subject: int,
    limit: int,
    sleep_seconds: float,
    dry_run: bool,
    max_books: int | None,
) -> ImportStats:
    stats = ImportStats()
    db = SessionLocal()
    try:
        existing_isbns = {row[0] for row in db.query(Book.isbn).all()}
        seen_in_session: set[str] = set()

        for subject in subjects:
            for page in range(1, pages_per_subject + 1):
                try:
                    payload = fetch_subject_page(subject, page, limit)
                except Exception:
                    stats.failed_requests += 1
                    continue

                docs = payload.get("docs") or []
                stats.fetched_docs += len(docs)

                for doc in docs:
                    mapped = map_doc_to_book_fields(doc)
                    if not mapped:
                        # Determine whether likely ISBN issue vs missing title/author.
                        if not pick_isbn(doc.get("isbn")):
                            stats.skipped_invalid_isbn += 1
                        else:
                            stats.skipped_missing_required += 1
                        continue

                    isbn = mapped["isbn"]
                    if isbn in existing_isbns or isbn in seen_in_session:
                        stats.skipped_duplicate_isbn += 1
                        continue

                    year = mapped.get("publication_year")
                    if year is not None:
                        current_year = datetime.now().year + 1
                        if not (1400 <= int(year) <= current_year):
                            stats.skipped_invalid_year += 1
                            continue

                    seen_in_session.add(isbn)

                    if dry_run:
                        stats.inserted += 1
                    else:
                        db.add(Book(**mapped))
                        existing_isbns.add(isbn)
                        stats.inserted += 1

                    if max_books and stats.inserted >= max_books:
                        if not dry_run:
                            db.commit()
                        return stats

                if not dry_run:
                    db.commit()
                if sleep_seconds > 0:
                    time.sleep(sleep_seconds)

        return stats
    except Exception:
        if not dry_run:
            db.rollback()
        raise
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import books from Open Library.")
    parser.add_argument(
        "--subjects",
        type=str,
        default=",".join(DEFAULT_SUBJECTS),
        help="Comma-separated subject names.",
    )
    parser.add_argument(
        "--pages-per-subject",
        type=int,
        default=3,
        help="Number of result pages to fetch per subject.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Result size per page (Open Library supports up to ~100).",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=0.2,
        help="Delay between API page requests.",
    )
    parser.add_argument(
        "--max-books",
        type=int,
        default=None,
        help="Optional cap on number of inserted records.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute import results without writing to DB.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    subjects = [s.strip() for s in args.subjects.split(",") if s.strip()]
    stats = import_open_library(
        subjects=subjects,
        pages_per_subject=args.pages_per_subject,
        limit=args.limit,
        sleep_seconds=args.sleep_seconds,
        dry_run=args.dry_run,
        max_books=args.max_books,
    )
    mode = "DRY_RUN" if args.dry_run else "WRITE"
    print(f"OPEN_LIBRARY_IMPORT_MODE={mode}")
    print(f"SUBJECTS={subjects}")
    print(
        "SUMMARY "
        f"fetched_docs={stats.fetched_docs} "
        f"inserted={stats.inserted} "
        f"skipped_missing_required={stats.skipped_missing_required} "
        f"skipped_invalid_isbn={stats.skipped_invalid_isbn} "
        f"skipped_duplicate_isbn={stats.skipped_duplicate_isbn} "
        f"skipped_invalid_year={stats.skipped_invalid_year} "
        f"failed_requests={stats.failed_requests}"
    )


if __name__ == "__main__":
    main()
