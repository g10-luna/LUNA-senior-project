# Book Service Design

Service path: `backend/book`  
API base path: `/api/v1/books`

## Purpose

The Book Service owns catalog data and discovery for LUNA. It provides:
- book CRUD for librarian/admin workflows
- catalog listing for student/librarian clients
- search/filter/sort/pagination
- availability status used by delivery/request flows

This design aligns with:
- `System Design/SYSTEM_DESIGN.md` (FR-2, FR-9; data + API sections)
- `System Design/BACKEND_IMPLEMENTATION_DESIGN.md`

## Current State

Implemented:
- FastAPI service entrypoint in `main.py`
- service health endpoints

Not yet implemented:
- catalog CRUD routes
- search/filter logic
- DB persistence layer for books
- role-based write protections
- tests

## Data Model

Primary table: `app.books` (already present in shared canonical models)

Important fields:
- `id` (UUID)
- `isbn` (unique, indexed)
- `title` (indexed)
- `author` (indexed)
- `publisher`
- `publication_year`
- `description`
- `cover_image_url`
- `status` (`AVAILABLE`, `CHECKED_OUT`, `RESERVED`, `UNAVAILABLE`)
- `shelf_location`
- `created_at`, `updated_at`

## API Design

### Read Endpoints

- `GET /api/v1/books`
  - query: `page`, `limit`, `sort`, `order`
  - filters: `status`, `author`, `publisher`, `year`, `q` (title/author/isbn)
  - response: paginated list

- `GET /api/v1/books/{book_id}`
  - returns a single book or `404`

- `GET /api/v1/books/isbn/{isbn}`
  - returns a single book by ISBN or `404`

- `GET /api/v1/books/discover/random`
  - returns random AVAILABLE books for discovery/home sections
  - query: `limit` (default 12, max 40)

- `GET /api/v1/books/authors/top`
  - returns top authors by catalog count
  - query: `limit` (default 10, max 50)

- `GET /api/v1/books/{book_id}/related`
  - returns related books using shared author/publisher
  - query: `limit` (default 10, max 20)

- `GET /api/v1/books/stats`
  - returns catalog summary counts:
    - total books
    - counts by status (`AVAILABLE`, `CHECKED_OUT`, `RESERVED`, `UNAVAILABLE`)
    - missing cover URL count
    - missing publication year count

### Write Endpoints (Librarian/Admin)

- `POST /api/v1/books`
  - create a book record
  - validates unique ISBN

- `PUT /api/v1/books/{book_id}`
  - full update with validation

- `PATCH /api/v1/books/{book_id}/status`
  - targeted status updates for operational flows

- `DELETE /api/v1/books/{book_id}`
  - soft-delete preferred for auditability (or hard-delete only if no references)

## Validation Rules

- ISBN required and unique
- title/author required and non-empty
- publication year reasonable range (for example: 1400..current_year+1)
- status must be valid enum value
- reject invalid sort fields
- enforce max page size (for example 100)

## Access Control

- `GET` endpoints: authenticated users (student/librarian/admin)
- write endpoints: librarian/admin only
- auth + role checks come from shared auth dependencies and JWT context

## Service Architecture

Planned module split:

```text
backend/book/
  main.py         # FastAPI app wiring
  routes.py       # HTTP routes and request parsing
  schemas.py      # Pydantic request/response models
  services.py     # business logic
  repository.py   # DB operations for app.books
```

DB primitives:
- `shared.db.SessionLocal`
- `shared.models.Book` and `shared.models.BookStatus`

## Error Contract

Use consistent error semantics:
- `400` invalid input/filter/sort
- `401` unauthenticated
- `403` forbidden role
- `404` book not found
- `409` ISBN conflict
- `500` unexpected internal errors (with server-side logging only)

## Performance Notes

- rely on DB indexes (`isbn`, `title`, `author`)
- default paginated responses only
- avoid unbounded text scans without limit/offset
- add optional Redis caching later for hot catalog queries

## Phased Implementation Plan

### Phase 1: Read-only Catalog
- implement `GET /books`, `GET /books/{id}`
- add filters + pagination
- add schemas and repository methods

### Phase 2: Write APIs
- implement create/update/status change endpoints
- enforce librarian/admin roles
- implement ISBN conflict handling

### Phase 3: Hardening
- tests (unit + integration)
- audit log events for write actions
- performance baseline and optimization pass

## Test Plan (Minimum)

- list books with pagination
- search by title/author/isbn
- filter by status
- get-by-id success and not-found
- create with valid payload and duplicate ISBN conflict
- unauthorized and forbidden access checks

## Dependencies

- Auth Service: identity + role claims
- Delivery/Request flows: consume `status` and book existence
- Shared DB models/migrations: canonical schema source

## Open Library Import

Use Open Library Search API to seed the catalog with free public metadata.

Script:

```text
backend/book/import_openlibrary.py
```

Run from `backend/`:

```bash
# Preview import volume without writing to DB
python -m book.import_openlibrary --dry-run

# Import with defaults (5 subjects, 3 pages each, limit 100/page)
python -m book.import_openlibrary

# Targeted import with limits
python -m book.import_openlibrary \
  --subjects "science_fiction,history,computer_science" \
  --pages-per-subject 5 \
  --max-books 2000
```

Import behavior:
- deduplicates by ISBN against existing `app.books`
- prefers ISBN-13 when available
- skips records missing required fields (`isbn`, `title`, `author`)
- defaults status to `AVAILABLE`

### API Trigger (Librarian/Admin)

You can also trigger import via API:

```text
POST /api/v1/books/import/open-library
```

Example payload:

```json
{
  "subjects": ["fantasy", "mystery"],
  "pages_per_subject": 2,
  "limit": 100,
  "sleep_seconds": 0.2,
  "max_books": 500,
  "dry_run": true
}
```
