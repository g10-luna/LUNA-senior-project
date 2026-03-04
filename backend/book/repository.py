"""
Persistence layer for Book Service.
"""
from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from shared.models import Book, BookRequest, BookReturn, BookStatus

SORT_FIELDS = {
    "title": Book.title,
    "author": Book.author,
    "publication_year": Book.publication_year,
    "created_at": Book.created_at,
    "updated_at": Book.updated_at,
    "isbn": Book.isbn,
    "status": Book.status,
}


def _apply_filters(
    stmt: Select,
    *,
    status: BookStatus | None,
    author: str | None,
    publisher: str | None,
    year: int | None,
    q: str | None,
) -> Select:
    if status is not None:
        stmt = stmt.where(Book.status == status)
    if author:
        stmt = stmt.where(Book.author.ilike(f"%{author}%"))
    if publisher:
        stmt = stmt.where(Book.publisher.ilike(f"%{publisher}%"))
    if year is not None:
        stmt = stmt.where(Book.publication_year == year)
    if q:
        like_q = f"%{q}%"
        stmt = stmt.where(
            or_(
                Book.title.ilike(like_q),
                Book.author.ilike(like_q),
                Book.isbn.ilike(like_q),
            )
        )
    return stmt


def list_books(
    db: Session,
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
) -> tuple[Sequence[Book], int]:
    base_stmt = _apply_filters(
        select(Book),
        status=status,
        author=author,
        publisher=publisher,
        year=year,
        q=q,
    )

    count_stmt = _apply_filters(
        select(func.count()).select_from(Book),
        status=status,
        author=author,
        publisher=publisher,
        year=year,
        q=q,
    )
    total = db.scalar(count_stmt) or 0

    sort_column = SORT_FIELDS[sort]
    ordered = sort_column.desc() if order == "desc" else sort_column.asc()
    stmt = base_stmt.order_by(ordered).limit(limit).offset((page - 1) * limit)
    items = db.scalars(stmt).all()
    return items, total


def get_book_by_id(db: Session, book_id: UUID) -> Book | None:
    return db.get(Book, book_id)


def get_book_by_isbn(db: Session, isbn: str) -> Book | None:
    stmt = select(Book).where(Book.isbn == isbn)
    return db.scalar(stmt)


def create_book(
    db: Session,
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
) -> Book:
    book = Book(
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
    db.add(book)
    db.flush()
    db.refresh(book)
    return book


def update_book(
    db: Session,
    *,
    book: Book,
    isbn: str,
    title: str,
    author: str,
    publisher: str | None,
    publication_year: int | None,
    description: str | None,
    cover_image_url: str | None,
    status: BookStatus,
    shelf_location: str | None,
) -> Book:
    book.isbn = isbn
    book.title = title
    book.author = author
    book.publisher = publisher
    book.publication_year = publication_year
    book.description = description
    book.cover_image_url = cover_image_url
    book.status = status
    book.shelf_location = shelf_location
    db.flush()
    db.refresh(book)
    return book


def update_book_status(db: Session, *, book: Book, status: BookStatus) -> Book:
    book.status = status
    db.flush()
    db.refresh(book)
    return book


def count_book_references(db: Session, *, book_id: UUID) -> int:
    req_count = db.scalar(
        select(func.count()).select_from(BookRequest).where(BookRequest.book_id == book_id)
    ) or 0
    ret_count = db.scalar(
        select(func.count()).select_from(BookReturn).where(BookReturn.book_id == book_id)
    ) or 0
    return req_count + ret_count


def delete_book(db: Session, *, book: Book) -> None:
    db.delete(book)


def get_catalog_stats(db: Session) -> dict[str, int]:
    total_books = db.scalar(select(func.count()).select_from(Book)) or 0
    missing_cover_count = db.scalar(
        select(func.count()).select_from(Book).where(Book.cover_image_url.is_(None))
    ) or 0
    missing_publication_year_count = db.scalar(
        select(func.count()).select_from(Book).where(Book.publication_year.is_(None))
    ) or 0

    status_counts_raw = db.execute(
        select(Book.status, func.count()).group_by(Book.status)
    ).all()
    status_counts = {status.value: count for status, count in status_counts_raw}

    return {
        "total_books": int(total_books),
        "available_books": int(status_counts.get(BookStatus.AVAILABLE.value, 0)),
        "checked_out_books": int(status_counts.get(BookStatus.CHECKED_OUT.value, 0)),
        "reserved_books": int(status_counts.get(BookStatus.RESERVED.value, 0)),
        "unavailable_books": int(status_counts.get(BookStatus.UNAVAILABLE.value, 0)),
        "missing_cover_count": int(missing_cover_count),
        "missing_publication_year_count": int(missing_publication_year_count),
    }


def get_related_books(
    db: Session,
    *,
    book: Book,
    limit: int,
) -> Sequence[Book]:
    stmt = (
        select(Book)
        .where(Book.id != book.id)
        .where(
            or_(
                Book.author == book.author,
                Book.publisher == book.publisher,
            )
        )
        .order_by(Book.updated_at.desc())
        .limit(limit)
    )
    return db.scalars(stmt).all()
