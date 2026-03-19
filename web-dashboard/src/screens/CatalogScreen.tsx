import { useEffect, useMemo, useState } from "react";
import { getMockBooks } from "../lib/catalogApi";
import type { Book } from "../lib/catalogTypes";
import "./Catalog.css";
import { useSearchParams } from "react-router-dom";

type StatusFilter = "all" | "available" | "unavailable" | "low_stock" | "custom";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "unavailable", label: "Unavailable" },
  { key: "low_stock", label: "Low Stock" },
  { key: "custom", label: "Custom..." },
];

function getCounts(book: Book) {
  // Mock data provides these, but keep fallbacks so the UI doesn't break.
  const totalCopies =
    book.total_copies ??
    (book.status === "LOW_STOCK" ? 2 : book.status === "AVAILABLE" ? 1 : 1);

  const availableCopies =
    book.available_copies ??
    (book.status === "AVAILABLE" ? totalCopies : book.status === "LOW_STOCK" ? Math.min(1, totalCopies) : 0);

  return { totalCopies, availableCopies };
}

function getStatusFlags(book: Book) {
  const { totalCopies, availableCopies } = getCounts(book);
  const isUnavailable = availableCopies <= 0 || book.status === "UNAVAILABLE" || book.status === "CHECKED_OUT" || book.status === "RESERVED";
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
  if (isUnavailable) return "\u{1F4D5}"; // BOOK_ABC
  if (isLowStock) return "\u23F3"; // HOURGLASS_NOT_DONE
  return "\u{1F4D8}"; // BLUE_BOOK
}

export default function CatalogScreen() {
  const [books, setBooks] = useState<Book[]>(() => getMockBooks());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [searchParams] = useSearchParams();
  const addParam = searchParams.get("add");

  useEffect(() => {
    if (addParam === "1") {
      setEditBookId(null);
      setIsAdding(true);
    }
  }, [addParam]);

  const clearAddParam = () => {
    if (addParam !== "1") return;
    // Remove ?add=1 so modal doesn't auto-open after cancel/save.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // no-op
    }
  };

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();

    return books.filter((b: Book) => {
      const flags = getStatusFlags(b);

      if (statusFilter === "unavailable" && !flags.isUnavailable) return false;
      if (statusFilter === "low_stock" && !flags.isLowStock) return false;
      if (statusFilter === "available" && !flags.isAvailable) return false;
      // "custom" currently behaves like "all" (search still includes location).

      if (!q) return true;
      const haystack = `${b.title} ${b.author} ${b.isbn} ${b.shelf_location ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [books, query, statusFilter]);

  const editingBook = useMemo(
    () => (editBookId ? books.find((b: Book) => b.id === editBookId) ?? null : null),
    [books, editBookId],
  );

  const [editForm, setEditForm] = useState<{
    title: string;
    author: string;
    isbn: string;
    shelf_location: string;
    total_copies: number;
    available_copies: number;
  }>({
    title: "",
    author: "",
    isbn: "",
    shelf_location: "",
    total_copies: 0,
    available_copies: 0,
  });

  useEffect(() => {
    if (!editingBook || isAdding) return;
    const counts = getCounts(editingBook);
    setEditForm({
      title: editingBook.title,
      author: editingBook.author,
      isbn: editingBook.isbn,
      shelf_location: editingBook.shelf_location ?? "",
      total_copies: counts.totalCopies,
      available_copies: counts.availableCopies,
    });
  }, [editingBook, isAdding]);

  useEffect(() => {
    if (!isAdding) return;
    setEditForm({
      title: "",
      author: "",
      isbn: "",
      shelf_location: "",
      total_copies: 1,
      available_copies: 1,
    });
  }, [isAdding]);

  const markAvailability = (bookId: string, makeAvailable: boolean) => {
    setBooks((prev: Book[]) =>
      prev.map((b: Book) => {
        if (b.id !== bookId) return b;
        const { totalCopies } = getCounts(b);

        if (makeAvailable) {
          return {
            ...b,
            status: "AVAILABLE",
            total_copies: totalCopies,
            available_copies: totalCopies,
          };
        }

        return {
          ...b,
          status: "UNAVAILABLE",
          total_copies: totalCopies,
          available_copies: 0,
        };
      }),
    );
  };

  const deleteBook = (bookId: string) => {
    setBooks((prev: Book[]) => prev.filter((b: Book) => b.id !== bookId));
  };

  const saveEdit = () => {
    if (!editingBook && !isAdding) return;

    const total = Math.max(0, Math.floor(editForm.total_copies));
    const available = Math.max(0, Math.min(Math.floor(editForm.available_copies), total));
    const nextStatus: Book["status"] =
      available <= 0 ? "UNAVAILABLE" : available < total ? "LOW_STOCK" : "AVAILABLE";

    if (isAdding) {
      const newBook: Book = {
        id: crypto.randomUUID(),
        title: editForm.title.trim(),
        author: editForm.author.trim(),
        isbn: editForm.isbn.trim(),
        shelf_location: editForm.shelf_location.trim(),
        status: nextStatus,
        total_copies: total,
        available_copies: available,
      };

      setBooks((prev: Book[]) => [newBook, ...prev]);
      setIsAdding(false);
      setEditBookId(null);
      clearAddParam();
      return;
    }

    if (!editingBook) return;
    setBooks((prev: Book[]) =>
      prev.map((b: Book) => {
        if (b.id !== editingBook.id) return b;

        return {
          ...b,
          title: editForm.title.trim(),
          author: editForm.author.trim(),
          isbn: editForm.isbn.trim(),
          shelf_location: editForm.shelf_location.trim(),
          status: nextStatus,
          total_copies: total,
          available_copies: available,
        };
      }),
    );

    setEditBookId(null);
    clearAddParam();
  };

  return (
    <div className="catalog-page">
      <div className="catalog-sticky">
        <div className="card">
        <div className="catalog-toolbar" style={{ flex: 1 }}>
          <div className="catalog-search-wrap">
            <span className="catalog-search-icon-left" aria-hidden>
              {"\u{1F50E}"}
            </span>
            <input
              className="catalog-search"
              type="search"
              placeholder="Search by Title, Author, ISBN, Location..."
              value={query}
              onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            />
            <span className="catalog-search-icon-right" aria-hidden>
              {"\u{1F50D}"}
            </span>
          </div>

          <button
            type="button"
            className="catalog-add-btn"
            onClick={() => {
              setEditBookId(null);
              setIsAdding(true);
            }}
          >
            + add book
          </button>
        </div>

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

      {filteredBooks.length === 0 ? (
        <p className="catalog-empty">No books found. Try changing your search or filters.</p>
      ) : (
        <ul className="catalog-list">
          {filteredBooks.map((book: Book) => {
            const flags = getStatusFlags(book);
            const showAvailableChip = flags.isAvailable;
            const showLowStockChip = flags.isLowStock;
            const showUnavailableChip = flags.isUnavailable;

            const markLabel = showUnavailableChip ? "Mark Available" : "Mark Unavailable";

            return (
              <li key={book.id} className="catalog-card card">
                <div className="catalog-card-icon" aria-hidden>
                  {getBookIcon(book)}
                </div>

                <div className="catalog-card-details">
                  <h3 className="catalog-card-title">{book.title}</h3>
                  <p className="catalog-card-author">by {book.author}</p>
                  <p className="catalog-card-meta">ISBN {book.isbn}</p>
                  <p className="catalog-card-meta">
                    {flags.availableCopies}/{flags.totalCopies} copies available
                  </p>
                </div>

                <div className="catalog-card-actions">
                  {showAvailableChip ? (
                    <span className="catalog-status-tag catalog-status-tag--available">Available</span>
                  ) : null}
                  {showLowStockChip ? (
                    <span className="catalog-status-tag catalog-status-tag--low_stock">Low Stock</span>
                  ) : null}
                  {showUnavailableChip ? (
                    <span className="catalog-status-tag catalog-status-tag--unavailable">Unavailable</span>
                  ) : null}

                  <p className="catalog-card-location">
                    <span className="catalog-card-location-icon" aria-hidden>
                      {"\u{1F4CD}"}
                    </span>
                    {book.shelf_location ?? "Shelf -"}
                  </p>

                  <div className="catalog-card-buttons">
                    <button
                      type="button"
                      className="catalog-btn catalog-btn-outline"
                      onClick={() => markAvailability(book.id, showUnavailableChip)}
                    >
                      {markLabel}
                    </button>

                    <button
                      type="button"
                      className="catalog-btn catalog-btn-outline"
                      onClick={() => {
                        setIsAdding(false);
                        setEditBookId(book.id);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="catalog-btn catalog-btn-icon"
                      aria-label="Delete book"
                      onClick={() => deleteBook(book.id)}
                    >
                      {"\u{1F5D1}"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(editingBook || isAdding) && (
        <div
          className="catalog-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e: { target: EventTarget; currentTarget: EventTarget }) => {
            if (e.target === e.currentTarget) {
              setIsAdding(false);
              setEditBookId(null);
              clearAddParam();
            }
          }}
        >
          <div className="catalog-modal">
            <h2 className="catalog-modal-title">{isAdding ? "Add book" : "Edit book"}</h2>

            <label className="catalog-form-label">Title</label>
            <input
              className="catalog-form-input"
              value={editForm.title}
              onChange={(e: { target: { value: string } }) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />

            <label className="catalog-form-label">Author</label>
            <input
              className="catalog-form-input"
              value={editForm.author}
              onChange={(e: { target: { value: string } }) => setEditForm((prev) => ({ ...prev, author: e.target.value }))}
            />

            <label className="catalog-form-label">ISBN</label>
            <input
              className="catalog-form-input"
              value={editForm.isbn}
              onChange={(e: { target: { value: string } }) => setEditForm((prev) => ({ ...prev, isbn: e.target.value }))}
            />

            <label className="catalog-form-label">Shelf location</label>
            <input
              className="catalog-form-input"
              value={editForm.shelf_location}
              onChange={(e: { target: { value: string } }) =>
                setEditForm((prev) => ({ ...prev, shelf_location: e.target.value }))
              }
            />

            <label className="catalog-form-label">Total books (copies)</label>
            <input
              className="catalog-form-input"
              type="number"
              min={0}
              value={editForm.total_copies}
              onChange={(e: { target: { value: string } }) => {
                const nextTotal = Math.max(0, Math.floor(Number(e.target.value)));
                setEditForm((prev) => ({
                  ...prev,
                  total_copies: nextTotal,
                  available_copies: Math.min(prev.available_copies, nextTotal),
                }));
              }}
            />

            <label className="catalog-form-label">Books available</label>
            <input
              className="catalog-form-input"
              type="number"
              min={0}
              value={editForm.available_copies}
              onChange={(e: { target: { value: string } }) => {
                const nextAvailable = Math.max(0, Math.floor(Number(e.target.value)));
                setEditForm((prev) => ({
                  ...prev,
                  available_copies: Math.min(nextAvailable, prev.total_copies),
                }));
              }}
            />

            <div className="catalog-modal-actions">
              <button
                type="button"
                className="catalog-btn catalog-btn-outline"
                onClick={() => {
                  setIsAdding(false);
                  setEditBookId(null);
                  clearAddParam();
                }}
              >
                Cancel
              </button>
              <button type="button" className="catalog-btn catalog-btn-primary" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
