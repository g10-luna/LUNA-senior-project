"""
Book Service API routes.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.schemas import UserResponse
from book.import_openlibrary import DEFAULT_SUBJECTS
from book.schemas import (
    AuthorCountResponse,
    BookCreateRequest,
    BookListQuery,
    BookResponse,
    BookStatusUpdateRequest,
    BookUpdateRequest,
    CatalogStatsResponse,
    OpenLibraryImportRequest,
    OpenLibraryImportResponse,
    OpenLibraryImportStatsResponse,
    PaginationResponse,
    PublisherCountResponse,
)
from book.services import (
    BookConflictError,
    BookNotFoundError,
    BookServiceError,
    create_book,
    delete_book,
    get_book,
    get_book_by_isbn,
    get_book_catalog_stats,
    get_random_discovery_books,
    get_top_authors,
    get_top_publishers,
    get_related_books,
    import_books_from_open_library,
    list_books,
    update_book,
    update_book_status,
)
from shared.auth_dependencies import RequireLibrarianOrAdmin, get_current_user_dep

router = APIRouter(prefix="/api/v1/books", tags=["books"])


def _success(data: dict) -> dict:
    return {
        "success": True,
        "data": data,
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": str(uuid.uuid4())[:8],
        },
    }


@router.get("/health")
def books_health():
    return {"status": "healthy"}


@router.get("/stats")
def get_catalog_stats_route(_user: UserResponse = Depends(get_current_user_dep)):
    stats = get_book_catalog_stats()
    payload = CatalogStatsResponse(**stats).model_dump(mode="json")
    return _success({"stats": payload})


@router.get("/discover/random")
def get_random_discovery_books_route(
    limit: Annotated[int, Query(ge=1, le=40)] = 12,
    _user: UserResponse = Depends(get_current_user_dep),
):
    items = get_random_discovery_books(limit=limit)
    return _success(
        {
            "items": [BookResponse.model_validate(book).model_dump(mode="json") for book in items],
            "count": len(items),
        }
    )


@router.get("/authors/top")
def get_top_authors_route(
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    _user: UserResponse = Depends(get_current_user_dep),
):
    items = [
        AuthorCountResponse(author=author, count=count).model_dump(mode="json")
        for author, count in get_top_authors(limit=limit)
    ]
    return _success({"items": items, "count": len(items)})


@router.get("/publishers/top")
def get_top_publishers_route(
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    _user: UserResponse = Depends(get_current_user_dep),
):
    items = [
        PublisherCountResponse(publisher=publisher, count=count).model_dump(mode="json")
        for publisher, count in get_top_publishers(limit=limit)
    ]
    return _success({"items": items, "count": len(items)})


@router.get("/")
def list_books_route(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    sort: Annotated[str, Query()] = "title",
    order: Annotated[str, Query()] = "asc",
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    author: str | None = None,
    publisher: str | None = None,
    year: int | None = None,
    q: str | None = None,
    _user: UserResponse = Depends(get_current_user_dep),
):
    try:
        parsed = BookListQuery(
            page=page,
            limit=limit,
            sort=sort,
            order=order,
            status=status_filter,
            author=author,
            publisher=publisher,
            year=year,
            q=q,
        )
        result = list_books(
            page=parsed.page,
            limit=parsed.limit,
            sort=parsed.sort,
            order=parsed.order,
            status=parsed.status,
            author=parsed.author,
            publisher=parsed.publisher,
            year=parsed.year,
            q=parsed.q,
        )
        total_pages = (result.total + parsed.limit - 1) // parsed.limit if result.total else 0
        return _success(
            {
                "items": [BookResponse.model_validate(b).model_dump(mode="json") for b in result.items],
                "pagination": PaginationResponse(
                    page=parsed.page,
                    limit=parsed.limit,
                    total=result.total,
                    total_pages=total_pages,
                ).model_dump(mode="json"),
            }
        )
    except BookServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{book_id}")
def get_book_route(book_id: UUID, _user: UserResponse = Depends(get_current_user_dep)):
    try:
        book = get_book(book_id)
        return _success({"book": BookResponse.model_validate(book).model_dump(mode="json")})
    except BookNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/isbn/{isbn}")
def get_book_by_isbn_route(
    isbn: str,
    _user: UserResponse = Depends(get_current_user_dep),
):
    try:
        book = get_book_by_isbn(isbn)
        return _success({"book": BookResponse.model_validate(book).model_dump(mode="json")})
    except BookNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{book_id}/related")
def get_related_books_route(
    book_id: UUID,
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
    _user: UserResponse = Depends(get_current_user_dep),
):
    try:
        items = get_related_books(book_id=book_id, limit=limit)
        return _success(
            {
                "items": [
                    BookResponse.model_validate(book).model_dump(mode="json")
                    for book in items
                ],
                "count": len(items),
            }
        )
    except BookNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/")
def create_book_route(
    req: BookCreateRequest,
    _user: UserResponse = RequireLibrarianOrAdmin,
):
    try:
        book = create_book(**req.model_dump())
        return _success({"book": BookResponse.model_validate(book).model_dump(mode="json")})
    except BookConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except BookServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{book_id}")
def update_book_route(
    book_id: UUID,
    req: BookUpdateRequest,
    _user: UserResponse = RequireLibrarianOrAdmin,
):
    try:
        book = update_book(book_id=book_id, **req.model_dump())
        return _success({"book": BookResponse.model_validate(book).model_dump(mode="json")})
    except BookNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except BookServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{book_id}/status")
def update_book_status_route(
    book_id: UUID,
    req: BookStatusUpdateRequest,
    _user: UserResponse = RequireLibrarianOrAdmin,
):
    try:
        book = update_book_status(book_id=book_id, status=req.status)
        return _success({"book": BookResponse.model_validate(book).model_dump(mode="json")})
    except BookNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{book_id}")
def delete_book_route(book_id: UUID, _user: UserResponse = RequireLibrarianOrAdmin):
    try:
        delete_book(book_id=book_id)
        return _success({"message": "Book deleted"})
    except BookNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/import/open-library")
def import_open_library_route(
    req: OpenLibraryImportRequest,
    _user: UserResponse = RequireLibrarianOrAdmin,
):
    try:
        effective_subjects = [s.strip() for s in req.subjects if s.strip()] or list(
            DEFAULT_SUBJECTS
        )
        stats = import_books_from_open_library(
            subjects=effective_subjects,
            pages_per_subject=req.pages_per_subject,
            limit=req.limit,
            sleep_seconds=req.sleep_seconds,
            dry_run=req.dry_run,
            max_books=req.max_books,
        )
        response = OpenLibraryImportResponse(
            mode="DRY_RUN" if req.dry_run else "WRITE",
            subjects=effective_subjects,
            stats=OpenLibraryImportStatsResponse(
                fetched_docs=stats.fetched_docs,
                inserted=stats.inserted,
                skipped_missing_required=stats.skipped_missing_required,
                skipped_invalid_isbn=stats.skipped_invalid_isbn,
                skipped_duplicate_isbn=stats.skipped_duplicate_isbn,
                skipped_invalid_year=stats.skipped_invalid_year,
                failed_requests=stats.failed_requests,
            ),
        )
        return _success({"import": response.model_dump(mode="json")})
    except BookServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
