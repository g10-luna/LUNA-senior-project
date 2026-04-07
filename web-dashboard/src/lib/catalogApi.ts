import { API_BASE_URL, apiFetch } from "./api";
import type { Book, CatalogQueryParams, Pagination } from "./catalogTypes";

type BooksEnvelope = {
  data?: unknown;
  pagination?: Pagination;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toBooksAndPagination(json: unknown): { items: Book[]; pagination?: Pagination } {
  if (Array.isArray(json)) return { items: json as Book[] };

  const top = asObject(json);
  if (!top) return { items: [] };

  const env = top as BooksEnvelope;
  const payload = env.data ?? json;

  if (Array.isArray(payload)) {
    return { items: payload as Book[], pagination: env.pagination };
  }

  const payloadObj = asObject(payload);
  if (!payloadObj) return { items: [] };

  const items = Array.isArray(payloadObj.items) ? (payloadObj.items as Book[]) : [];
  const pagination = asObject(payloadObj.pagination) as Pagination | null;
  return { items, pagination: pagination ?? env.pagination };
}

function messageFromStatus(status: number): string {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to view the catalog.";
  if (status === 404) {
    if (!API_BASE_URL) {
      return "Catalog API endpoint not found. Set VITE_API_BASE_URL in web-dashboard/.env and restart the dev server.";
    }
    return "Catalog endpoint not found.";
  }
  return "Failed to load catalog.";
}

function mutationMessageFromStatus(status: number, fallback: string): string {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to modify the catalog.";
  if (status === 404) {
    if (!API_BASE_URL) {
      return "Catalog API endpoint not found. Set VITE_API_BASE_URL in web-dashboard/.env and restart the dev server.";
    }
    return "Book not found.";
  }
  if (status === 409) return "A book with this ISBN already exists.";
  if (status === 422) return "Invalid book data. Check required fields and try again.";
  return fallback;
}

function readApiErrorDetail(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const obj = body as Record<string, unknown>;
  const detail = obj.detail;

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const pieces = detail
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const msg = typeof row.msg === "string" ? row.msg : null;
        const loc = Array.isArray(row.loc) ? row.loc.join(".") : null;
        if (msg && loc) return `${loc}: ${msg}`;
        return msg;
      })
      .filter((x): x is string => !!x);
    if (pieces.length > 0) return pieces.join("; ");
  }

  return null;
}

export type BookMutationInput = {
  title: string;
  author: string;
  isbn?: string;
  shelf_location?: string;
  status?: string;
  publisher?: string | null;
  publication_year?: number | null;
  description?: string | null;
  cover_image_url?: string | null;
};

function toBook(value: unknown): Book | null {
  const obj = asObject(value);
  if (!obj) return null;
  if (typeof obj.id !== "string" || typeof obj.title !== "string" || typeof obj.author !== "string") {
    return null;
  }
  return obj as unknown as Book;
}

export async function listBooks(
  params: CatalogQueryParams = {}
): Promise<{ items: Book[]; pagination?: Pagination }> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.status) search.set("status", params.status);

  const qs = search.toString();
  const res = await apiFetch(`/api/v1/books/${qs ? `?${qs}` : ""}`);
  const contentType = res.headers.get("content-type") ?? "";
  const json = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(messageFromStatus(res.status));
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Catalog API returned non-JSON. Check VITE_API_BASE_URL in web-dashboard/.env and restart the dev server."
    );
  }

  return toBooksAndPagination(json);
}

export async function createBook(input: BookMutationInput): Promise<Book> {
  const payload = {
    title: input.title.trim(),
    author: input.author.trim(),
    isbn: input.isbn?.trim() || undefined,
    shelf_location: input.shelf_location?.trim() || undefined,
    status: input.status ?? "AVAILABLE",
    publisher: input.publisher ?? null,
    publication_year: input.publication_year ?? null,
    description: input.description ?? null,
    cover_image_url: input.cover_image_url ?? null,
  };
  const res = await apiFetch("/api/v1/books/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = readApiErrorDetail(json);
    throw new Error(detail ?? mutationMessageFromStatus(res.status, "Failed to create book."));
  }

  const top = asObject(json);
  const data = top && "data" in top ? (top.data as unknown) : json;
  return toBook(data) ?? ({ id: crypto.randomUUID(), ...payload } as Book);
}

export async function updateBook(bookId: string, input: BookMutationInput): Promise<Book> {
  const payload = {
    title: input.title.trim(),
    author: input.author.trim(),
    isbn: input.isbn?.trim() || undefined,
    shelf_location: input.shelf_location?.trim() || undefined,
    status: input.status ?? "AVAILABLE",
    publisher: input.publisher ?? null,
    publication_year: input.publication_year ?? null,
    description: input.description ?? null,
    cover_image_url: input.cover_image_url ?? null,
  };
  const res = await apiFetch(`/api/v1/books/${bookId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = readApiErrorDetail(json);
    throw new Error(detail ?? mutationMessageFromStatus(res.status, "Failed to update book."));
  }

  const top = asObject(json);
  const data = top && "data" in top ? (top.data as unknown) : json;
  return toBook(data) ?? ({ id: bookId, ...payload } as Book);
}

export async function deleteBook(bookId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/books/${bookId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(mutationMessageFromStatus(res.status, "Failed to delete book."));
}
