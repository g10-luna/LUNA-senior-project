import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../lib/routes";
import {
  fetchBooks,
  getMockBooks,
  createMockBook,
  getDisplayStatus,
} from "../lib/catalogApi";
import type { Book, CatalogFilter } from "../lib/catalogTypes";
import "./Catalog.css";

const FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
  { value: "low_stock", label: "Low Stock" },
  { value: "custom", label: "Custom..." },
];

function BookCard({
  book,
  onToggleStatus,
  onDelete,
}: {
  book: Book;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const displayStatus = getDisplayStatus(book);
  const available = book.available_copies ?? 0;
  const total = book.total_copies ?? 1;
  const isAvailable = displayStatus === "available" || (displayStatus === "low_stock" && available > 0);

  return (
    <article className="catalog-card card">
      <div className="catalog-card-icon" aria-hidden>
        📚
      </div>
      <div className="catalog-card-details">
        <h3 className="catalog-card-title">{book.title}</h3>
        <p className="catalog-card-author">by {book.author}</p>
        <p className="catalog-card-meta">ISBN {book.isbn}</p>
        <p className="catalog-card-meta">
          {available}/{total} copies available
        </p>
      </div>
      <div className="catalog-card-actions">
        <span
          className={`catalog-status-tag catalog-status-tag--${displayStatus}`}
        >
          {displayStatus === "low_stock" && isAvailable
            ? "Low Stock Available"
            : displayStatus === "available"
              ? "Available"
              : "Unavailable"}
        </span>
        <p className="catalog-card-location">
          <span className="catalog-card-location-icon" aria-hidden>📍</span>
          {book.shelf_location}
        </p>
        <div className="catalog-card-buttons">
          <button
            type="button"
            className="catalog-btn catalog-btn-outline"
            onClick={() => onToggleStatus(book.id)}
          >
            {isAvailable ? "Mark Unavailable" : "Mark Available"}
          </button>
          <button
            type="button"
            className="catalog-btn catalog-btn-icon"
            onClick={() => onDelete(book.id)}
            aria-label="Delete book"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CatalogScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [addBookOpen, setAddBookOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBooks()
      .then((data) => {
        if (!cancelled) setBooks(data);
      })
      .catch(() => {
        if (!cancelled) setBooks(getMockBooks());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = books;
    if (q) {
      list = list.filter(
        (b: Book) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          (b.shelf_location && b.shelf_location.toLowerCase().includes(q))
      );
    }
    if (filter === "all") return list;
    return list.filter((b: Book) => {
      const status = getDisplayStatus(b);
      if (filter === "available") return status === "available";
      if (filter === "unavailable") return status === "unavailable";
      if (filter === "low_stock") return status === "low_stock";
      return true;
    });
  }, [books, searchQuery, filter]);

  const handleToggleStatus = (id: string) => {
    setBooks((prev: Book[]) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next =
          b.status === "AVAILABLE" || b.status === "LOW_STOCK"
            ? "UNAVAILABLE"
            : "AVAILABLE";
        const avail = b.available_copies ?? 0;
        const total = b.total_copies ?? 1;
        return {
          ...b,
          status: next as Book["status"],
          available_copies:
            next === "AVAILABLE" ? Math.min(avail + 1, total) : Math.max(0, avail - 1),
        };
      })
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Remove this book from the catalog?")) {
      setBooks((prev: Book[]) => prev.filter((b: Book) => b.id !== id));
    }
  };

  const handleAddBook = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.querySelector('[name="title"]') as HTMLInputElement)?.value?.trim();
    const author = (form.querySelector('[name="author"]') as HTMLInputElement)?.value?.trim();
    const isbn = (form.querySelector('[name="isbn"]') as HTMLInputElement)?.value?.trim();
    const shelf_location = (form.querySelector('[name="shelf_location"]') as HTMLInputElement)?.value?.trim() || "—";
    if (!title || !author || !isbn) return;
    const newBook = createMockBook({
      title,
      author,
      isbn,
      shelf_location,
      status: "AVAILABLE",
      total_copies: 1,
      available_copies: 1,
    });
    setBooks((prev: Book[]) => [newBook, ...prev]);
    setAddBookOpen(false);
    form.reset();
  };

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <button
          type="button"
          className="catalog-back"
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          <span className="catalog-back-icon" aria-hidden>←</span>
          Back to Dashboard
        </button>
        <h1 className="catalog-title">Library Catalog</h1>
      </header>

      <div className="catalog-toolbar">
        <div className="catalog-search-wrap">
          <span className="catalog-search-icon-left" aria-hidden>☰</span>
          <input
            type="search"
            className="catalog-search"
            placeholder="Search by Title, Author, ISBN, Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search catalog"
          />
          <span className="catalog-search-icon-right" aria-hidden>🔍</span>
        </div>
        <button
          type="button"
          className="catalog-add-btn"
          onClick={() => setAddBookOpen(true)}
        >
          + add book
        </button>
      </div>

      <div className="catalog-filters">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`catalog-filter-pill ${filter === value ? "catalog-filter-pill--active" : ""}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {addBookOpen && (
        <div className="catalog-modal-backdrop" onClick={() => setAddBookOpen(false)} role="presentation">
          <div className="catalog-modal card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <h2 className="catalog-modal-title">Add book</h2>
            <form onSubmit={handleAddBook}>
              <label className="catalog-form-label">
                Title
                <input type="text" name="title" required className="catalog-form-input" />
              </label>
              <label className="catalog-form-label">
                Author
                <input type="text" name="author" required className="catalog-form-input" />
              </label>
              <label className="catalog-form-label">
                ISBN
                <input type="text" name="isbn" required className="catalog-form-input" />
              </label>
              <label className="catalog-form-label">
                Shelf location
                <input type="text" name="shelf_location" className="catalog-form-input" placeholder="e.g. Shelf B-20" />
              </label>
              <div className="catalog-modal-actions">
                <button type="button" className="catalog-btn catalog-btn-outline" onClick={() => setAddBookOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="catalog-btn catalog-btn-primary">
                  Add book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="catalog-loading">Loading catalog…</p>
      ) : filteredBooks.length === 0 ? (
        <p className="catalog-empty">No books match your search or filter.</p>
      ) : (
        <ul className="catalog-list">
          {filteredBooks.map((book) => (
            <li key={book.id}>
              <BookCard
                book={book}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
