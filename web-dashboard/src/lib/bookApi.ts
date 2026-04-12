import { apiFetch } from "./api";

/** Book status from backend (app.books) */
export type BookStatus =
  | "AVAILABLE"
  | "CHECKED_OUT"
  | "RESERVED"
  | "UNAVAILABLE";

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string | null;
  publication_year: number | null;
  description: string | null;
  cover_image_url: string | null;
  status: BookStatus;
  shelf_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface BookListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  status?: BookStatus;
  author?: string;
  publisher?: string;
  year?: number;
  q?: string;
}

export interface BookListResponse {
  success: boolean;
  data: {
    items: Book[];
    pagination: Pagination;
  };
}

export interface CatalogStatsResponse {
  success: boolean;
  data: {
    stats: {
      total_books: number;
      available_books: number;
      checked_out_books: number;
      reserved_books: number;
      unavailable_books: number;
      missing_cover_count: number;
      missing_publication_year_count: number;
    };
  };
}

function buildQuery(params: BookListParams): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.status) search.set("status", params.status);
  if (params.author) search.set("author", params.author);
  if (params.publisher) search.set("publisher", params.publisher);
  if (params.year != null) search.set("year", String(params.year));
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Parse JSON or throw a clear error when the server returns HTML (e.g. 404 or wrong base URL). */
async function parseJsonOrThrow<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const isHtml = contentType.includes("text/html") || text.trimStart().toLowerCase().startsWith("<!doctype");
    const hint = isHtml
      ? "The request is hitting the frontend (you got the app's HTML). Set VITE_API_BASE_URL in web-dashboard/.env to your backend URL (e.g. http://localhost:8000) and restart the dev server."
      : "Check that VITE_API_BASE_URL points to the backend and the book API is running.";
    throw new Error(`${context}: server returned non-JSON (got ${contentType || "unknown type"}). ${hint}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.trim().slice(0, 80);
    throw new Error(
      `${context}: invalid JSON. ` +
        "The backend may have returned an HTML error page. " +
        (preview ? `Response started with: ${preview}…` : "")
    );
  }
}

/**
 * Fetches paginated book catalog from backend GET /api/v1/books.
 * Requires auth (Bearer token via apiFetch).
 */
export async function fetchBookList(
  params: BookListParams = {}
): Promise<BookListResponse> {
  const url = `/api/v1/books/${buildQuery(params)}`;
  const res = await apiFetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Books API error ${res.status}: ${text || res.statusText}`);
  }
  return parseJsonOrThrow<BookListResponse>(res, "Books list");
}

/**
 * Fetches catalog stats from backend GET /api/v1/books/stats.
 */
export async function fetchCatalogStats(): Promise<CatalogStatsResponse> {
  const res = await apiFetch("/api/v1/books/stats");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Books stats API error ${res.status}: ${text || res.statusText}`);
  }
  return parseJsonOrThrow<CatalogStatsResponse>(res, "Catalog stats");
}
