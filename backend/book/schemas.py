"""
Pydantic schemas for Book Service.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from shared.models import BookStatus


class BookBase(BaseModel):
    isbn: str = Field(..., min_length=3, max_length=32)
    title: str = Field(..., min_length=1, max_length=300)
    author: str = Field(..., min_length=1, max_length=200)
    publisher: str | None = Field(default=None, max_length=200)
    publication_year: int | None = None
    description: str | None = None
    cover_image_url: str | None = None
    status: BookStatus = BookStatus.AVAILABLE
    shelf_location: str | None = Field(default=None, max_length=120)


class BookCreateRequest(BookBase):
    pass


class BookUpdateRequest(BookBase):
    pass


class BookStatusUpdateRequest(BaseModel):
    status: BookStatus


class BookResponse(BookBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort: Literal[
        "title",
        "author",
        "publication_year",
        "created_at",
        "updated_at",
        "isbn",
        "status",
    ] = "title"
    order: Literal["asc", "desc"] = "asc"
    status: BookStatus | None = None
    author: str | None = None
    publisher: str | None = None
    year: int | None = None
    q: str | None = None


class PaginationResponse(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
