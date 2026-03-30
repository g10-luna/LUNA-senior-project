import { apiFetch } from "./api";
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
  if (status === 404) return "Catalog endpoint not found.";
  return "Failed to load catalog.";
}

function mutationMessageFromStatus(status: number, fallback: string): string {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to modify the catalog.";
  if (status === 404) return "Book not found.";
  if (status === 409) return "A book with this ISBN already exists.";
  if (status === 422) return "Invalid book data. Check required fields and try again.";
  return fallback;
}

export type BookMutationInput = {
  title: string;
  author: string;
  isbn?: string;
  shelf_location?: string;
  status?: string;
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

  const qs = search.toString();
  const res = await apiFetch(`/api/v1/books${qs ? `?${qs}` : ""}`);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(messageFromStatus(res.status));

  return toBooksAndPagination(json);
}

export async function createBook(input: BookMutationInput): Promise<Book> {
  const payload = {
    title: input.title.trim(),
    author: input.author.trim(),
    isbn: input.isbn?.trim() || undefined,
    shelf_location: input.shelf_location?.trim() || undefined,
    status: input.status ?? "AVAILABLE",
  };
  const res = await apiFetch("/api/v1/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(mutationMessageFromStatus(res.status, "Failed to create book."));

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
  };
  const res = await apiFetch(`/api/v1/books/${bookId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(mutationMessageFromStatus(res.status, "Failed to update book."));

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
