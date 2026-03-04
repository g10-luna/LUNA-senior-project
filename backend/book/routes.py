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
from book.schemas import (
    BookCreateRequest,
    BookListQuery,
    BookResponse,
    BookStatusUpdateRequest,
    BookUpdateRequest,
    PaginationResponse,
)
from book.services import (
    BookConflictError,
    BookNotFoundError,
    BookServiceError,
    create_book,
    delete_book,
    get_book,
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
