# Mobile Homepage Plan (Full)

This document defines the full design for the LUNA mobile home tab: six backend-supported sections, order of content, and implementation steps.

---

## 1. Homepage content order

Content flows top to bottom as follows:

| Order | Block | Description |
|-------|--------|-------------|
| 1 | **Header** | Existing: galaxy background, LUNA branding, notification bell, profile avatar |
| 2 | **Search bar** | Existing: search input + filter button; wire to Search tab with query (Phase 1) |
| 3 | **Section 1 – Discover / For you** | Horizontal scroll of book cards from backend |
| 4 | **Section 2 – New arrivals** | Horizontal scroll of recently added books |
| 5 | **Section 3 – Available now** | Horizontal scroll of available books |
| 6 | **Section 4 – Browse by author** | Top authors (chips or list); tap → books by that author |
| 7 | **Section 5 – Browse by publisher** | Top publishers; tap → books by that publisher |
| 8 | **Section 6 – Browse by year** | Top publication years; tap → books from that year |
| 9 | **After the 6 categories – Catalog stats** | Strip showing e.g. total books, available count (from overview stats) |
| 10 | **End** | Optional “See full catalog” CTA; then end of scroll |

---

## 2. Six categories the backend supports

The backend does not expose a “category” field. These six **section types** are derived from existing Book API endpoints:

| # | Section label | Backend source | Notes |
|---|----------------|----------------|--------|
| 1 | **Discover / For you** | `GET /api/v1/books/discover/overview` → `random_books`, or `GET /api/v1/books/discover/random` | Random AVAILABLE books; one call can power overview |
| 2 | **New arrivals** | `GET /api/v1/books?sort=created_at&order=desc&limit=12` | Most recently added books |
| 3 | **Available now** | `GET /api/v1/books?status=AVAILABLE&limit=12` | Can reuse `random_books` from overview (already available-only) or call list endpoint |
| 4 | **Top authors** | `overview.top_authors` or `GET /api/v1/books/authors/top` | List/chips; tap → `GET /api/v1/books?author={name}` |
| 5 | **Top publishers** | `overview.top_publishers` or `GET /api/v1/books/publishers/top` | Same pattern; tap → `GET /api/v1/books?publisher={name}` |
| 6 | **Top years** | `overview.top_years` or `GET /api/v1/books/years/top` | Same pattern; tap → `GET /api/v1/books?year={year}` |

**After the 6 categories:** Use `overview.stats` (from discover/overview) for the catalog stats strip: total books, available, checked out, etc.

---

## 3. API usage summary

- **Primary:** `GET /api/v1/books/discover/overview?books_limit=12&top_limit=5`  
  Returns: `random_books`, `top_authors`, `top_publishers`, `top_years`, `stats`.  
  Use for: Discover section, Browse by author/publisher/year, and stats strip.
- **Additional list calls (per section):**
  - New arrivals: `GET /api/v1/books?sort=created_at&order=desc&limit=12`
  - Available now: either reuse `random_books` or `GET /api/v1/books?status=AVAILABLE&limit=12`
- **Auth:** All book endpoints require `Authorization: Bearer <access_token>` (from `getAccessToken()`).

---

## 4. Implementation steps

### 4.1 Books API client and types

- **Add** `mobile/src/services/books.ts`:
  - Base URL via `getApiUrl()`, auth header via `getAccessToken()`.
  - Types: book (id, title, author, cover_image_url, status, publisher, publication_year, etc.), discover overview response (random_books, top_authors, top_publishers, top_years, stats), and list response (paginated).
  - `getDiscoverOverview(booksLimit?, topLimit?)` → calls `GET /api/v1/books/discover/overview`, returns `data`.
  - `getBooks(params?)` → calls `GET /api/v1/books` with optional sort, order, status, author, publisher, year, page, limit.
  - Handle non-2xx (throw or return error shape) for loading/error UI.

### 4.2 Home screen state and data loading

- In `mobile/app/(tabs)/index.tsx`:
  - State: `overview` (typed), `newArrivals` (book list), `loading`, `error`.
  - On mount (when `hasToken === true`): call `getDiscoverOverview(12, 5)`; optionally call `getBooks({ sort: 'created_at', order: 'desc', limit: 12 })` for New arrivals.
  - Optional: pull-to-refresh to re-fetch.

### 4.3 Six sections + stats (replace static CATEGORIES)

- **Section 1 – Discover:** Render `overview.random_books` in horizontal ScrollView; reuse existing book card layout.
- **Section 2 – New arrivals:** Render `newArrivals` from list API (or second batch if using same endpoint with different params).
- **Section 3 – Available now:** Use same `overview.random_books` with different section title, or dedicated `getBooks({ status: 'AVAILABLE', limit: 12 })`.
- **Sections 4–6 – Browse:** Render `overview.top_authors`, `top_publishers`, `top_years` as chips or horizontal list; “See all” / tap navigates to catalog list (or placeholder) with author/publisher/year filter.
- **After the 6:** Render catalog stats from `overview.stats` (e.g. total_books, available_books). Optional “See full catalog” button.

### 4.4 Book card: real data and cover

- Data: `title`, `author`, `status` (map to “Available” / “Checked out” / “Reserved” / “Unavailable”).
- Cover: if `book.cover_image_url` use `<Image source={{ uri: book.cover_image_url }} />`; else keep current placeholder (icon + gradient).
- Tap: navigate to book detail screen if present (e.g. `/book/[id]`), else no-op or placeholder.

### 4.5 Search bar

- On submit: navigate to Search tab and pass query (e.g. via context or params). Optional later: `GET /api/v1/books/search/suggestions?q=...` for suggestions.

### 4.6 “See all” and navigation

- Discover / New arrivals / Available: “See all” → catalog list screen (e.g. `GET /api/v1/books`) or placeholder route.
- Browse by author/publisher/year: tap item → catalog list with corresponding filter (author=, publisher=, year=) or placeholder.

### 4.7 Error, loading, and empty UI

- **Loading:** Show spinner or skeleton while `loading === true`.
- **Error:** Show message + retry when overview or list request fails.
- **Empty:** If `random_books` or new arrivals empty, show “No books right now” and still show browse sections + stats if present.

---

## 5. File summary

| Action | File |
|--------|------|
| Add | `mobile/src/services/books.ts` – API client, types, `getDiscoverOverview()`, `getBooks()` |
| Edit | `mobile/app/(tabs)/index.tsx` – state, fetch overview + new arrivals, 6 sections + stats, real covers/status, loading/error/empty, optional pull-to-refresh |
| Optional | Search bar: pass query to Search tab; add catalog list screen and book detail screen when ready |

---

## 6. Out of scope (follow-up)

- Book detail page implementation (only navigation hook if route exists).
- Full catalog list screen with filters (only “See all” / tap target).
- Search suggestions API (dropdown) as Phase 2.
