import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createBook, deleteBook, listBooks, updateBook } from "../lib/catalogApi";
import type { Book } from "../lib/catalogTypes";
import "./Catalog.css";

type StatusFilter = "all" | "available" | "unavailable" | "low_stock";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "unavailable", label: "Unavailable" },
  { key: "low_stock", label: "Low Stock" },
];

const PAGE_SIZE = 20;
type BookForm = {
  title: string;
  author: string;
  isbn: string;
  shelf_location: string;
  status: "AVAILABLE" | "UNAVAILABLE";
};

function getCounts(book: Book) {
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

function getStatusFlags(book: Book) {
  const { totalCopies, availableCopies } = getCounts(book);
  const isUnavailable =
    availableCopies <= 0 ||
    book.status === "UNAVAILABLE" ||
    book.status === "CHECKED_OUT" ||
    book.status === "RESERVED";
  const isLowStock = !isUnavailable && totalCopies > 0 && availableCopies > 0 && availableCopies < totalCopies;
  const isAvailable = availableCopies > 0 && !isUnavailable;

  return {
    isUnavailable,
    isLowStock,
    isAvailable,
    totalCopies,
    availableCopies,
  };
}

function getBookIcon(book: Book) {
  const { isUnavailable, isLowStock } = getStatusFlags(book);
  if (isUnavailable) return "N/A";
  if (isLowStock) return "!";
  return "OK";
}

export default function CatalogScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<BookForm>({
    title: "",
    author: "",
    isbn: "",
    shelf_location: "",
    status: "AVAILABLE",
  });

  const addParam = searchParams.get("add");

  useEffect(() => {
    if (addParam === "1") {
      setIsAdding(true);
      setEditingBookId(null);
      setMutationError(null);
    }
  }, [addParam]);

  const clearAddParam = () => {
    if (addParam !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  };

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
  }, [page, submittedQuery, refreshToken]);

  const filteredBooks = useMemo(() => {
    return books.filter((b: Book) => {
      const flags = getStatusFlags(b);
      if (statusFilter === "unavailable" && !flags.isUnavailable) return false;
      if (statusFilter === "low_stock" && !flags.isLowStock) return false;
      if (statusFilter === "available" && !flags.isAvailable) return false;
      return true;
    });
  }, [books, statusFilter]);

  const editingBook = useMemo(
    () => (editingBookId ? books.find((b) => b.id === editingBookId) ?? null : null),
    [books, editingBookId]
  );

  useEffect(() => {
    if (editingBook && !isAdding) {
      setForm({
        title: editingBook.title ?? "",
        author: editingBook.author ?? "",
        isbn: editingBook.isbn ?? "",
        shelf_location: editingBook.shelf_location ?? editingBook.location ?? "",
        status: editingBook.status === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
      });
    }
  }, [editingBook, isAdding]);

  useEffect(() => {
    if (isAdding) {
      setForm({
        title: "",
        author: "",
        isbn: "",
        shelf_location: "",
        status: "AVAILABLE",
      });
    }
  }, [isAdding]);

  const canPrev = page > 1;
  const canNext = totalPages ? page < totalPages : books.length === PAGE_SIZE;

  const closeModal = () => {
    setIsAdding(false);
    setEditingBookId(null);
    setMutationError(null);
    clearAddParam();
  };

  const onSave = async () => {
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
        await updateBook(editingBookId, form);
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
  };

  const onDelete = async (bookId: string) => {
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
  };

  return (
    <div className="catalog-page">
      <div className="catalog-sticky">
        <div className="card">
          <div className="catalog-toolbar" style={{ flex: 1 }}>
            <div className="catalog-search-wrap">
              <span className="catalog-search-icon-left" aria-hidden>
                🔍
              </span>
              <input
                className="catalog-search"
                type="search"
                placeholder="Search by Title, Author, ISBN, Location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSubmittedQuery(query);
                  }
                }}
              />
              <span className="catalog-search-icon-right" aria-hidden>
                
              </span>
            </div>
            <button
              type="button"
              className="catalog-add-btn"
              onClick={() => {
                setIsAdding(true);
                setEditingBookId(null);
              }}
            >
              + Add Book
            </button>
            <button
              type="button"
              className="catalog-add-btn"
              disabled={loading}
              onClick={() => {
                setPage(1);
                setSubmittedQuery(query);
              }}
            >
              Search
            </button>
            <button
              type="button"
              className="catalog-add-btn"
              onClick={() => {
                setQuery("");
                setSubmittedQuery("");
                setPage(1);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="catalog-add-btn"
              disabled={loading}
              onClick={() => setRefreshToken((n) => n + 1)}
            >
              Refresh
            </button>
          </div>

          {lastLoadedAt ? (
            <p className="catalog-last-loaded" role="status">
              Last loaded {lastLoadedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
            </p>
          ) : null}

          <div className="catalog-filters">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  className={`catalog-filter-pill ${active ? "catalog-filter-pill--active" : ""}`}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? <p className="catalog-loading">Loading catalog...</p> : null}
      {error ? (
        <div className="catalog-error-row" role="alert">
          <p className="catalog-empty" style={{ color: "var(--red)", marginBottom: 0 }}>
            {error}
          </p>
          <button
            type="button"
            className="catalog-btn catalog-btn-outline"
            disabled={loading}
            onClick={() => {
              setError(null);
              setRefreshToken((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      {mutationError && !(isAdding || editingBook) ? (
        <p className="catalog-empty" style={{ color: "var(--red)" }}>{mutationError}</p>
      ) : null}
      {!loading && !error && filteredBooks.length === 0 ? (
        <p className="catalog-empty">No books found. Try changing your search or filters.</p>
      ) : null}

      {!error && filteredBooks.length > 0 ? (
        <ul className="catalog-list">
          {filteredBooks.map((book: Book) => {
            const flags = getStatusFlags(book);
            const location = book.shelf_location ?? book.location ?? "Unknown location";
            return (
              <li key={book.id} className="catalog-card card">
                <div className="catalog-card-icon" aria-hidden>
                  {getBookIcon(book)}
                </div>
                <div className="catalog-card-details">
                  <h3 className="catalog-card-title">{book.title || "Untitled"}</h3>
                  <p className="catalog-card-author">by {book.author || "Unknown author"}</p>
                  <p className="catalog-card-meta">ISBN {book.isbn || "-"}</p>
                  <p className="catalog-card-meta">
                    {flags.availableCopies}/{flags.totalCopies} copies available
                  </p>
                </div>
                <div className="catalog-card-actions">
                  {flags.isAvailable ? (
                    <span className="catalog-status-tag catalog-status-tag--available">Available</span>
                  ) : null}
                  {flags.isLowStock ? (
                    <span className="catalog-status-tag catalog-status-tag--low_stock">Low Stock</span>
                  ) : null}
                  {flags.isUnavailable ? (
                    <span className="catalog-status-tag catalog-status-tag--unavailable">Unavailable</span>
                  ) : null}
                  <p className="catalog-card-location">{location}</p>
                  <div className="catalog-card-buttons">
                    <button
                      type="button"
                      className="catalog-btn catalog-btn-outline"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingBookId(book.id);
                        setMutationError(null);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="catalog-btn catalog-btn-icon"
                      disabled={saving}
                      onClick={() => void onDelete(book.id)}
                      aria-label="Delete book"
                    >
                      X
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="card" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button type="button" className="catalog-btn catalog-btn-outline" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="catalog-card-meta">
          Page {page}
          {totalPages ? ` of ${totalPages}` : ""}
        </span>
        <button type="button" className="catalog-btn catalog-btn-outline" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>

      {(isAdding || editingBook) && (
        <div
          className="catalog-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="catalog-modal">
            <h2 className="catalog-modal-title">{isAdding ? "Add book" : "Edit book"}</h2>
            {mutationError ? (
              <p className="catalog-empty" style={{ color: "var(--red)", marginBottom: "12px" }}>
                {mutationError}
              </p>
            ) : null}

            <label className="catalog-form-label">Title *</label>
            <input
              className="catalog-form-input"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />

            <label className="catalog-form-label">Author *</label>
            <input
              className="catalog-form-input"
              value={form.author}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
            />

            <label className="catalog-form-label">ISBN *</label>
            <input
              className="catalog-form-input"
              value={form.isbn}
              onChange={(e) => setForm((prev) => ({ ...prev, isbn: e.target.value }))}
            />

            <label className="catalog-form-label">Shelf location</label>
            <input
              className="catalog-form-input"
              value={form.shelf_location}
              onChange={(e) => setForm((prev) => ({ ...prev, shelf_location: e.target.value }))}
            />

            <label className="catalog-form-label">Availability</label>
            <select
              className="catalog-form-input"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
                }))
              }
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>

            <div className="catalog-modal-actions">
              <button type="button" className="catalog-btn catalog-btn-outline" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="catalog-btn catalog-btn-primary" onClick={() => void onSave()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
