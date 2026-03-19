import { useEffect, useState } from "react";
import {
  fetchBookList,
  fetchCatalogStats,
  type Book,
  type BookListParams,
  type BookStatus,
} from "../lib/bookApi";

const PAGE_SIZE = 20;
const STATUS_LABELS: Record<BookStatus, string> = {
  AVAILABLE: "Available",
  CHECKED_OUT: "Checked out",
  RESERVED: "Reserved",
  UNAVAILABLE: "Unavailable",
};

function BookCard({ book }: { book: Book }) {
  return (
    <div className="card" style={{ textAlign: "left" }}>
      {book.cover_image_url ? (
        <img
          src={book.cover_image_url}
          alt=""
          style={{
            width: "100%",
            maxHeight: 180,
            objectFit: "cover",
            borderRadius: 8,
            marginBottom: 12,
          }}
        />
      ) : (
        <div
          style={{
            height: 120,
            background: "var(--surface-soft)",
            borderRadius: 8,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No cover
        </div>
      )}
      <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>{book.title}</h4>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
        {book.author}
      </p>
      {book.publisher && (
        <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          {book.publisher}
          {book.publication_year != null ? ` (${book.publication_year})` : ""}
        </p>
      )}
      <p
        style={{
          margin: "8px 0 0 0",
          fontSize: 12,
          fontWeight: 600,
          color:
            book.status === "AVAILABLE"
              ? "var(--green)"
              : book.status === "CHECKED_OUT"
                ? "var(--gold)"
                : "var(--text-muted)",
        }}
      >
        {STATUS_LABELS[book.status]}
      </p>
      {book.shelf_location && (
        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          Shelf: {book.shelf_location}
        </p>
      )}
    </div>
  );
}

export default function CatalogScreen() {
  const [items, setItems] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatus | "">("");
  const [stats, setStats] = useState<{
    total_books: number;
    available_books: number;
    checked_out_books: number;
  } | null>(null);

  const loadBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: BookListParams = {
        page,
        limit: PAGE_SIZE,
        sort: "title",
        order: "asc",
      };
      if (search.trim()) params.q = search.trim();
      if (statusFilter) params.status = statusFilter as BookStatus;

      const res = await fetchBookList(params);
      setItems(res.data.items);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.total_pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetchCatalogStats();
      if (res.success && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch {
      // Stats are optional; catalog list is primary
    }
  };

  useEffect(() => {
    loadBooks();
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div style={{ padding: "0 0 2rem 0" }}>
      <h1 className="section-title" style={{ marginBottom: 16 }}>
        Library Catalog
      </h1>

      {stats != null && (
        <div
          className="card"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total books</div>
            <div style={{ fontWeight: 600 }}>{stats.total_books}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Available</div>
            <div style={{ fontWeight: 600, color: "var(--green)" }}>
              {stats.available_books}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Checked out</div>
            <div style={{ fontWeight: 600 }}>{stats.checked_out_books}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Search by title, author, or ISBN..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              flex: "1 1 200px",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 14,
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter((e.target.value || "") as BookStatus | "");
              setPage(1);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 14,
              minWidth: 140,
            }}
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "var(--navy)",
              color: "var(--text-light)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            borderColor: "var(--red)",
            background: "rgba(191, 49, 51, 0.08)",
          }}
        >
          <p style={{ margin: 0, color: "var(--red)" }}>{error}</p>
          {error.includes("text/html") || error.includes("frontend") ? (
            <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "var(--text-dark)" }}>
              <strong>Fix:</strong> In the <code>web-dashboard</code> folder, create or edit <code>.env</code> with{" "}
              <code>VITE_API_BASE_URL=http://localhost:8000</code> (or your backend URL), then restart <code>npm run dev</code>.
            </p>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Loading catalog…
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          No books found. Try changing your search or filters.
        </div>
      ) : (
        <>
          <p style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 14 }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
            {total}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 20,
            }}
          >
            {items.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  opacity: page <= 1 ? 0.6 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  opacity: page >= totalPages ? 0.6 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
