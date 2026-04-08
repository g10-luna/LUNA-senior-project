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


class OpenLibraryImportRequest(BaseModel):
    subjects: list[str] = Field(default_factory=list)
    pages_per_subject: int = Field(default=3, ge=1, le=20)
    limit: int = Field(default=100, ge=1, le=100)
    sleep_seconds: float = Field(default=0.2, ge=0.0, le=5.0)
    max_books: int | None = Field(default=None, ge=1, le=10000)
    dry_run: bool = False


class OpenLibraryImportStatsResponse(BaseModel):
    fetched_docs: int
    inserted: int
    skipped_missing_required: int
    skipped_invalid_isbn: int
    skipped_duplicate_isbn: int
    skipped_invalid_year: int
    failed_requests: int


class OpenLibraryImportResponse(BaseModel):
    mode: str
    subjects: list[str]
    stats: OpenLibraryImportStatsResponse


class CatalogStatsResponse(BaseModel):
    total_books: int
    available_books: int
    checked_out_books: int
    reserved_books: int
    unavailable_books: int
    missing_cover_count: int
    missing_publication_year_count: int


class AuthorCountResponse(BaseModel):
    author: str
    count: int
    author_image_url: str | None = None


class PublisherCountResponse(BaseModel):
    publisher: str
    count: int


class PublicationYearCountResponse(BaseModel):
    year: int
    count: int


class SearchSuggestionResponse(BaseModel):
    label: str
    type: Literal["title", "author", "isbn"]


class FilterOptionsResponse(BaseModel):
    authors: list[str]
    publishers: list[str]
    years: list[int]


class CoverageResponse(BaseModel):
    total_books: int
    with_cover_count: int
    with_publication_year_count: int
    with_description_count: int
    with_cover_percent: float
    with_publication_year_percent: float
    with_description_percent: float


class IsbnNormalizationResponse(BaseModel):
    scanned: int
    updated: int
    skipped_invalid: int
    skipped_conflict: int
    dry_run: bool


class PerfBaselineResponse(BaseModel):
    iterations: int
    limit: int
    avg_ms: float
    min_ms: float
    max_ms: float
    p95_ms: float
