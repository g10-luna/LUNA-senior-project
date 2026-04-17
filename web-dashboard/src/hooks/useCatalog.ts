/**
 * useCatalog – catalog data-management hook
 *
 * Encapsulates all state and side-effects related to fetching, filtering,
 * paginating, and mutating the book catalog.  CatalogScreen becomes a pure
 * view layer that destructures this hook's return value.
 *
 * Refactor rationale: Separation of Concerns.
 * The original CatalogScreen.tsx (804 lines) violated the Single Responsibility
 * Principle by mixing data-fetching, hardware I/O, and rendering in one file.
 * This hook owns exactly one concern: the catalog data layer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createBook, deleteBook, listBooks, updateBook } from "../lib/catalogApi";
import type { Book } from "../lib/catalogTypes";

// ---------------------------------------------------------------------------
// Shared constants & pure helpers (moved here from the screen)
// ---------------------------------------------------------------------------

export type StatusFilter = "all" | "available" | "unavailable" | "low_stock";

export const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "unavailable", label: "Unavailable" },
  { key: "low_stock", label: "Low Stock" },
];

export const PAGE_SIZE = 20;

export type BookForm = {
  title: string;
  author: string;
  isbn: string;
  shelf_location: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  cover_image_url?: string | null;
};

const EMPTY_FORM: BookForm = {
  title: "",
  author: "",
  isbn: "",
  shelf_location: "",
  status: "AVAILABLE",
  cover_image_url: null,
};

export function getCounts(book: Book) {
  const totalCopies = book.total_copies ?? 1;
  const availableCopies =
    book.available_copies ??
    (typeof book.available === "boolean"
      ? book.available
        ? totalCopies
        : 0
      : book.status === "AVAILABLE"
        ? totalCopies
        : 0);
  return { totalCopies, availableCopies };
}

export function getStatusFlags(book: Book) {
  const { totalCopies, availableCopies } = getCounts(book);
  const isUnavailable =
    availableCopies <= 0 ||
    book.status === "UNAVAILABLE" ||
    book.status === "CHECKED_OUT" ||
    book.status === "RESERVED";
  const isLowStock =
    !isUnavailable && totalCopies > 0 && availableCopies > 0 && availableCopies < totalCopies;
  const isAvailable = availableCopies > 0 && !isUnavailable;
  return { isUnavailable, isLowStock, isAvailable, totalCopies, availableCopies };
}

export function getBookIcon(book: Book) {
  const { isUnavailable, isLowStock } = getStatusFlags(book);
  if (isUnavailable) return "N/A";
  if (isLowStock) return "!";
  return "OK";
}

export function getPaginationWindow(currentPage: number, totalPages: number): number[] {
  const windowSize = 7;
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// ---------------------------------------------------------------------------
// Hook return type (explicit contract – replaces implicit prop-drilling)
// ---------------------------------------------------------------------------

export type UseCatalogReturn = {
  // Data
  books: Book[];
  filteredBooks: Book[];
  editingBook: Book | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  mutationError: string | null;
  lastLoadedAt: Date | null;
  totalPages: number | null;
  page: number;
  pageWindow: number[];
  canPrev: boolean;
  canNext: boolean;
  // Form
  form: BookForm;
  setForm: React.Dispatch<React.SetStateAction<BookForm>>;
  isAdding: boolean;
  editingBookId: string | null;
  statusFilter: StatusFilter;
  query: string;
  // Callbacks
  setQuery: (q: string) => void;
  setStatusFilter: (f: StatusFilter) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
  setIsAdding: (v: boolean) => void;
  setEditingBookId: (id: string | null) => void;
  setMutationError: (msg: string | null) => void;
  setRefreshToken: (fn: (n: number) => number) => void;
  setError: (msg: string | null) => void;
  submitSearch: () => void;
  clearSearch: () => void;
  closeModal: () => void;
  onSave: () => Promise<void>;
  onDelete: (bookId: string) => Promise<void>;
  // Scanner integration
  isbnLookupGenRef: React.MutableRefObject<number>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** React import needed for the dispatch type above. */
import type React from "react";

export function useCatalog(): UseCatalogReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Data state ─────────────────────────────────────────────────────────
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // ── Modal / form state ─────────────────────────────────────────────────
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<BookForm>(EMPTY_FORM);

  // Ref used by useIsbnScanner to cancel stale lookups when the modal closes
  const isbnLookupGenRef = useRef(0);

  // ── URL param: ?add=1 opens the add-book modal ─────────────────────────
  const addParam = searchParams.get("add");

  useEffect(() => {
    if (addParam === "1") {
      setIsAdding(true);
      setEditingBookId(null);
      setMutationError(null);
    }
  }, [addParam]);

  const clearAddParam = useCallback(() => {
    if (addParam !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [addParam, searchParams, setSearchParams]);

  // ── Reset to page 1 when filter changes ────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // ── Fetch books ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listBooks({
          q: submittedQuery.trim() || undefined,
          page,
          limit: PAGE_SIZE,
          sort: "title",
          order: "asc",
          status:
            statusFilter === "available"
              ? "AVAILABLE"
              : statusFilter === "unavailable"
                ? "UNAVAILABLE"
                : undefined,
        });
        if (cancelled) return;
        setBooks(result.items);
        setTotalPages(result.pagination?.total_pages ?? null);
        setLastLoadedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        setBooks([]);
        setError(err instanceof Error ? err.message : "Failed to load catalog.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [page, submittedQuery, refreshToken, statusFilter]);

  // ── Derived / memoised values ──────────────────────────────────────────
  const filteredBooks = useMemo(() => {
    if (statusFilter !== "low_stock") return books;
    return books.filter((b: Book) => getStatusFlags(b).isLowStock);
  }, [books, statusFilter]);

  const editingBook = useMemo(
    () => (editingBookId ? books.find((b) => b.id === editingBookId) ?? null : null),
    [books, editingBookId]
  );

  // Populate form when entering edit mode
  useEffect(() => {
    if (editingBook && !isAdding) {
      setForm({
        title: editingBook.title ?? "",
        author: editingBook.author ?? "",
        isbn: editingBook.isbn ?? "",
        shelf_location: editingBook.shelf_location ?? editingBook.location ?? "",
        status: editingBook.status === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
        cover_image_url: editingBook.cover_image_url ?? null,
      });
    }
  }, [editingBook, isAdding]);

  // Reset form when entering add mode
  useEffect(() => {
    if (isAdding) {
      setForm(EMPTY_FORM);
    }
  }, [isAdding]);

  // ── Pagination helpers ─────────────────────────────────────────────────
  const canPrev = page > 1;
  const canNext = totalPages ? page < totalPages : books.length === PAGE_SIZE;
  const pageWindow = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [];
    return getPaginationWindow(page, totalPages);
  }, [page, totalPages]);

  // ── Actions ────────────────────────────────────────────────────────────
  const submitSearch = useCallback(() => {
    setPage(1);
    setSubmittedQuery(query);
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setSubmittedQuery("");
    setPage(1);
  }, []);

  const closeModal = useCallback(() => {
    // Bump the generation counter so any in-flight ISBN lookup is discarded
    isbnLookupGenRef.current += 1;
    setIsAdding(false);
    setEditingBookId(null);
    setMutationError(null);
    clearAddParam();
  }, [clearAddParam]);

  const onSave = useCallback(async () => {
    if (saving) return;
    const title = form.title.trim();
    const author = form.author.trim();
    const isbn = form.isbn.trim();
    if (!title || !author || !isbn) {
      setMutationError("Title, author, and ISBN are required.");
      return;
    }
    setSaving(true);
    setMutationError(null);
    try {
      if (isAdding) {
        await createBook(form);
      } else if (editingBookId) {
        await updateBook(editingBookId, {
          ...form,
          publisher: editingBook?.publisher ?? null,
          publication_year: editingBook?.publication_year ?? null,
          description: editingBook?.description ?? null,
          cover_image_url: form.cover_image_url ?? editingBook?.cover_image_url ?? null,
        });
      } else {
        return;
      }
      closeModal();
      setRefreshToken((n) => n + 1);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to save book.");
    } finally {
      setSaving(false);
    }
  }, [saving, form, isAdding, editingBookId, editingBook, closeModal]);

  const onDelete = useCallback(
    async (bookId: string) => {
      if (saving) return;
      const ok = window.confirm("Delete this book from the catalog?");
      if (!ok) return;
      setSaving(true);
      setMutationError(null);
      try {
        await deleteBook(bookId);
        setRefreshToken((n) => n + 1);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to delete book.");
      } finally {
        setSaving(false);
      }
    },
    [saving]
  );

  return {
    books,
    filteredBooks,
    editingBook,
    loading,
    saving,
    error,
    mutationError,
    lastLoadedAt,
    totalPages,
    page,
    pageWindow,
    canPrev,
    canNext,
    form,
    setForm,
    isAdding,
    editingBookId,
    statusFilter,
    query,
    setQuery,
    setStatusFilter,
    setPage,
    setIsAdding,
    setEditingBookId,
    setMutationError,
    setRefreshToken,
    setError,
    submitSearch,
    clearSearch,
    closeModal,
    onSave,
    onDelete,
    isbnLookupGenRef,
  };
}
