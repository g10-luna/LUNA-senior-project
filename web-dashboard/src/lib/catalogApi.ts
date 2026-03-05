/**
 * Catalog API client. Uses mock data for now; when the backend exposes
 * GET /api/v1/books (returning an array of books), we can use it instead.
 * No backend changes required.
 */
import { apiFetch } from "./api";
import type { Book } from "./catalogTypes";

const MOCK_BOOKS: Book[] = [
  {
    id: "1",
    title: "Machine Learning Basics",
    author: "Dr. Sarah Chen",
    isbn: "978-1-234-56789-0",
    status: "AVAILABLE",
    shelf_location: "Shelf B-20",
    total_copies: 4,
    available_copies: 4,
  },
  {
    id: "2",
    title: "Data Structures & Algorithms",
    author: "Jennifer Park",
    isbn: "978-1-234-56789-1",
    status: "UNAVAILABLE",
    shelf_location: "Shelf B-22",
    total_copies: 2,
    available_copies: 0,
  },
  {
    id: "3",
    title: "Python Programming Guide",
    author: "Marcus Johnson",
    isbn: "978-1-234-56789-2",
    status: "LOW_STOCK",
    shelf_location: "Shelf B-21",
    total_copies: 2,
    available_copies: 1,
  },
];

function isBookArray(data: unknown): data is Book[] {
  return Array.isArray(data) && (data.length === 0 || (typeof data[0] === "object" && data[0] !== null && "id" in data[0] && "title" in data[0]));
}

/**
 * Fetch books. If backend returns an array of books, use it; otherwise use mock data.
 */
export async function fetchBooks(): Promise<Book[]> {
  try {
    const res = await apiFetch("/api/v1/books");
    const data = await res.json();
    if (isBookArray(data)) return data;
  } catch {
    // ignore
  }
  return [...MOCK_BOOKS];
}

/**
 * In-memory list for mutations until backend supports create/update/delete.
 * Catalog screen will manage its own state and use these helpers for consistency.
 */
export function getMockBooks(): Book[] {
  return [...MOCK_BOOKS];
}

export function createMockBook(book: Omit<Book, "id">): Book {
  return {
    ...book,
    id: crypto.randomUUID(),
    total_copies: book.total_copies ?? 1,
    available_copies: book.available_copies ?? (book.status === "AVAILABLE" || book.status === "LOW_STOCK" ? 1 : 0),
  };
}

export function getDisplayStatus(book: Book): "available" | "unavailable" | "low_stock" {
  if (book.status === "UNAVAILABLE" || book.status === "CHECKED_OUT" || book.status === "RESERVED") return "unavailable";
  const available = book.available_copies ?? (book.status === "AVAILABLE" ? 1 : 0);
  const total = book.total_copies ?? 1;
  if (total > 0 && available > 0 && available < total) return "low_stock";
  return "available";
}
