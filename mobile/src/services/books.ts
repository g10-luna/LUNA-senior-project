import { getApiUrl, getAccessToken, apiFetch } from './auth';

/** Book status from backend (app.books.status). */
export type BookStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'RESERVED' | 'UNAVAILABLE';

/** Single book from API (matches backend BookResponse). */
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

/** Author with count (top authors). Optional Open Library author photo URL. */
export interface AuthorCount {
  author: string;
  count: number;
  author_image_url?: string | null;
}

/** Publisher with count. */
export interface PublisherCount {
  publisher: string;
  count: number;
}

/** Year with count. */
export interface YearCount {
  year: number;
  count: number;
}

/** Catalog stats from overview. */
export interface CatalogStats {
  total_books: number;
  available_books: number;
  checked_out_books: number;
  reserved_books: number;
  unavailable_books: number;
  missing_cover_count: number;
  missing_publication_year_count: number;
}

/** Discover overview payload (GET /api/v1/books/discover/overview). */
export interface DiscoverOverview {
  random_books: Book[];
  top_authors: AuthorCount[];
  top_publishers: PublisherCount[];
  top_years: YearCount[];
  stats: CatalogStats;
}

/** Paginated list response (GET /api/v1/books). */
export interface BookListResponse {
  items: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/** Search suggestion item from GET /api/v1/books/search/suggestions. */
export interface SearchSuggestion {
  label: string;
  type: 'title' | 'author' | 'isbn';
}

/** API error for non-2xx. */
export class BooksApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'BooksApiError';
  }
}

const BOOKS_BASE = '/api/v1/books';

async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiUrl().replace(/\/$/, '');
  const token = await getAccessToken();
  if (__DEV__) {
    console.log('[books] authenticatedFetch', {
      baseUrl: base,
      path,
      hasToken: !!(token && String(token).trim()),
      tokenLength: token?.length ?? 0,
    });
  }
  if (!token?.trim()) {
    if (__DEV__) console.warn('[books] No token in SecureStore');
    throw new BooksApiError('Please log in again', 401);
  }
  const res = await apiFetch(path, init);
  if (__DEV__ && !res.ok) {
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    console.warn('[books] API error', { url, status: res.status, statusText: res.statusText });
  }
  return res;
}

/** Parse API response: expects { success, data }. Throws BooksApiError on non-2xx or success false. */
async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof json?.detail === 'string' ? json.detail : res.statusText;
    throw new BooksApiError(detail || `Request failed (${res.status})`, res.status, json);
  }
  if (json.success === false) {
    throw new BooksApiError('Request failed', res.status, json);
  }
  return json.data as T;
}

/**
 * Fetch discover overview (random books, top authors/publishers/years, stats).
 * Requires auth.
 */
export async function getDiscoverOverview(
  booksLimit: number = 12,
  topLimit: number = 5
): Promise<DiscoverOverview> {
  const params = new URLSearchParams({
    books_limit: String(booksLimit),
    top_limit: String(topLimit),
  });
  const res = await authenticatedFetch(`${BOOKS_BASE}/discover/overview?${params}`);
  return parseApiResponse<DiscoverOverview>(res);
}

/**
 * Fetch random books from the catalog (for "Popular Right Now" / discovery).
 * Requires auth.
 */
export async function getRandomBooks(limit: number = 6): Promise<Book[]> {
  const res = await authenticatedFetch(`${BOOKS_BASE}/discover/random?limit=${limit}`);
  const data = await parseApiResponse<{ items: Book[]; count: number }>(res);
  return data?.items ?? [];
}

/**
 * Fetch top authors by book count (dedicated endpoint, supports limit up to 50).
 * Requires auth.
 */
export async function getTopAuthors(limit: number = 20): Promise<AuthorCount[]> {
  const res = await authenticatedFetch(`${BOOKS_BASE}/authors/top?limit=${limit}`);
  const data = await parseApiResponse<{ items: AuthorCount[]; count: number }>(res);
  return data?.items ?? [];
}

/** Query params for listing books. */
export interface GetBooksParams {
  page?: number;
  limit?: number;
  sort?: 'title' | 'author' | 'publication_year' | 'created_at' | 'updated_at' | 'isbn' | 'status';
  order?: 'asc' | 'desc';
  status?: BookStatus;
  author?: string;
  publisher?: string;
  year?: number;
  q?: string;
}

/**
 * List books with optional filters and pagination.
 * Requires auth.
 */
export async function getBooks(params: GetBooksParams = {}): Promise<BookListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.sort) search.set('sort', params.sort);
  if (params.order) search.set('order', params.order);
  if (params.status) search.set('status', params.status);
  if (params.author) search.set('author', params.author);
  if (params.publisher) search.set('publisher', params.publisher);
  if (params.year != null) search.set('year', String(params.year));
  if (params.q) search.set('q', params.q);
  const qs = search.toString();
  // Use trailing slash so FastAPI doesn't 307 redirect (redirect can drop Authorization header)
  const path = qs ? `${BOOKS_BASE}/?${qs}` : `${BOOKS_BASE}/`;
  const res = await authenticatedFetch(path);
  return parseApiResponse<BookListResponse>(res);
}

/**
 * Fetch a single book by ID.
 * Requires auth.
 */
export async function getBook(bookId: string): Promise<Book> {
  const res = await authenticatedFetch(`${BOOKS_BASE}/${bookId}`);
  const data = await parseApiResponse<{ book: Book }>(res);
  return data.book;
}

/**
 * Fetch search suggestions (title/author/isbn matches).
 * Requires auth.
 */
export async function getSearchSuggestions(
  q: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  const res = await authenticatedFetch(`${BOOKS_BASE}/search/suggestions?${params}`);
  const data = await parseApiResponse<{ items: SearchSuggestion[]; count: number }>(res);
  return data?.items ?? [];
}
