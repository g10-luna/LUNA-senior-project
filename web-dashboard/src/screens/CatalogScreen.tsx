/**
 * CatalogScreen – view layer only (refactored)
 *
 * All data-management logic lives in useCatalog.
 * All barcode / ISBN-lookup logic lives in useIsbnScanner.
 * This file is now purely JSX composition: 230 lines vs the original 804.
 *
 * Refactor: Lab 3 – AI-Assisted Refactoring (Separation of Concerns)
 */

import { useCatalog, getStatusFlags, getBookIcon, STATUS_FILTERS } from "../hooks/useCatalog";
import { useIsbnScanner } from "../hooks/useIsbnScanner";
import { normalizeIsbnForLookup } from "../lib/isbnMetadataLookup";
import "./Catalog.css";

export default function CatalogScreen() {
  const catalog = useCatalog();

  const scanner = useIsbnScanner({
    // VIBE Human Correction: async signature so loading/error state propagates
    onIsbnScanned: catalog.onSave as unknown as (isbn: string) => Promise<void>,
    form: catalog.form,
    setForm: catalog.setForm,
    isbnLookupGenRef: catalog.isbnLookupGenRef,
    modalOpen: catalog.isAdding || catalog.editingBook !== null,
    editingBookId: catalog.editingBookId,
    isAdding: catalog.isAdding,
  });

  const {
    filteredBooks, loading, error, mutationError, lastLoadedAt,
    page, totalPages, pageWindow, canPrev, canNext,
    statusFilter, query, isAdding, editingBook, saving, form,
    setQuery, setStatusFilter, setPage, setIsAdding, setEditingBookId,
    setMutationError, setRefreshToken, setError, setForm,
    submitSearch, clearSearch, closeModal, onSave, onDelete,
  } = catalog;

  const {
    cameraScanOpen, scannerHint, videoRef, isbnInputRef,
    openCameraScanner, focusExternalBarcodeScanner, runIsbnLookup,
    setCameraScanOpen, CAN_USE_CAMERA_BARCODE,
  } = scanner;

  return (
    <div className="catalog-page">
      {/* ── Sticky toolbar ─────────────────────────────────────────── */}
      <div className="catalog-sticky">
        <div className="card">
          <div className="catalog-toolbar" style={{ flex: 1 }}>
            <div className="catalog-search-wrap">
              <span className="catalog-search-icon-left" aria-hidden>🔍</span>
              <input
                className="catalog-search"
                type="search"
                placeholder="Search by Title, Author, ISBN, Location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
              />
              <span className="catalog-search-icon-right" aria-hidden> </span>
            </div>
            <button type="button" className="catalog-add-btn"
              onClick={() => { setIsAdding(true); setEditingBookId(null); }}>
              + Add Book
            </button>
            <button type="button" className="catalog-add-btn" disabled={loading}
              onClick={submitSearch}>Search</button>
            <button type="button" className="catalog-add-btn" onClick={clearSearch}>Clear</button>
            <button type="button" className="catalog-add-btn" disabled={loading}
              onClick={() => setRefreshToken((n) => n + 1)}>Refresh</button>
          </div>

          {lastLoadedAt ? (
            <p className="catalog-last-loaded" role="status">
              Last loaded {lastLoadedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
            </p>
          ) : null}

          <div className="catalog-filters">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} type="button"
                className={`catalog-filter-pill ${statusFilter === f.key ? "catalog-filter-pill--active" : ""}`}
                onClick={() => setStatusFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status messages ────────────────────────────────────────── */}
      {loading ? <p className="catalog-loading">Loading catalog...</p> : null}
      {error ? (
        <div className="catalog-error-row" role="alert">
          <p className="catalog-empty" style={{ color: "var(--red)", marginBottom: 0 }}>{error}</p>
          <button type="button" className="catalog-btn catalog-btn-outline" disabled={loading}
            onClick={() => { setError(null); setRefreshToken((n) => n + 1); }}>
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

      {/* ── Book list ──────────────────────────────────────────────── */}
      {!error && filteredBooks.length > 0 ? (
        <ul className="catalog-list">
          {filteredBooks.map((book) => {
            const flags = getStatusFlags(book);
            const location = book.shelf_location ?? book.location ?? "Unknown location";
            return (
              <li key={book.id} className="catalog-card card">
                {book.cover_image_url ? (
                  <img className="catalog-card-cover" src={book.cover_image_url}
                    alt={`Cover for ${book.title || "book"}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (next) next.style.display = "flex";
                    }} />
                ) : null}
                <div className="catalog-card-icon" aria-hidden style={{ display: book.cover_image_url ? "none" : "flex" }}>
                  {getBookIcon(book)}
                </div>
                <div className="catalog-card-details">
                  <h3 className="catalog-card-title">{book.title || "Untitled"}</h3>
                  <p className="catalog-card-author">by {book.author || "Unknown author"}</p>
                  <p className="catalog-card-meta">ISBN {book.isbn || "-"}</p>
                  <p className="catalog-card-meta">{flags.availableCopies}/{flags.totalCopies} copies available</p>
                </div>
                <div className="catalog-card-actions">
                  {flags.isAvailable ? <span className="catalog-status-tag catalog-status-tag--available">Available</span> : null}
                  {flags.isLowStock ? <span className="catalog-status-tag catalog-status-tag--low_stock">Low Stock</span> : null}
                  {flags.isUnavailable ? <span className="catalog-status-tag catalog-status-tag--unavailable">Unavailable</span> : null}
                  <p className="catalog-card-location">{location}</p>
                  <div className="catalog-card-buttons">
                    <button type="button" className="catalog-btn catalog-btn-outline"
                      onClick={() => { setIsAdding(false); setEditingBookId(book.id); setMutationError(null); }}>
                      Edit
                    </button>
                    <button type="button" className="catalog-btn catalog-btn-icon" disabled={saving}
                      onClick={() => void onDelete(book.id)} aria-label="Delete book">X</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* ── Pagination ─────────────────────────────────────────────── */}
      <div className="card catalog-pagination-wrap">
        <button type="button" className="catalog-btn catalog-btn-outline" disabled={!canPrev}
          onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span className="catalog-card-meta">Page {page}{totalPages ? ` of ${totalPages}` : ""}</span>
        {pageWindow.length > 0 ? (
          <div className="catalog-page-numbers">
            {pageWindow.map((p) => (
              <button key={p} type="button"
                className={`catalog-btn catalog-btn-outline${p === page ? " catalog-page-number--active" : ""}`}
                onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        ) : null}
        <button type="button" className="catalog-btn catalog-btn-outline" disabled={!canNext}
          onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {/* ── Add / Edit modal ───────────────────────────────────────── */}
      {(isAdding || editingBook) && (
        <div className="catalog-modal-backdrop" role="dialog" aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={`catalog-modal${cameraScanOpen ? " catalog-modal--scanner" : ""}`}>
            <h2 className="catalog-modal-title">{isAdding ? "Add book" : "Edit book"}</h2>
            {mutationError ? (
              <p className="catalog-empty" style={{ color: "var(--red)", marginBottom: "12px" }}>{mutationError}</p>
            ) : null}

            <label className="catalog-form-label" id="catalog-isbn-label">ISBN *</label>
            <p className="catalog-isbn-hint">
              Scan or type an ISBN — we&apos;ll look up <strong>title</strong> and <strong>author</strong> from
              Open Library when possible (camera, external scanner, or <strong>Look up from ISBN</strong> below).
            </p>
            <input ref={isbnInputRef} className="catalog-form-input catalog-isbn-input"
              value={form.isbn} onChange={(e) => setForm((prev) => ({ ...prev, isbn: e.target.value }))}
              autoComplete="off" spellCheck={false} aria-labelledby="catalog-isbn-label" />

            <div className="catalog-barcode-actions">
              <button type="button" className="catalog-btn catalog-btn-outline catalog-btn-barcode"
                onClick={focusExternalBarcodeScanner}>External scanner</button>
              {CAN_USE_CAMERA_BARCODE ? (
                <button type="button" className="catalog-btn catalog-btn-outline catalog-btn-barcode"
                  onClick={openCameraScanner} disabled={cameraScanOpen}>
                  {cameraScanOpen ? "Camera on…" : "Use camera"}
                </button>
              ) : (
                <span className="catalog-barcode-unsupported" title="Supported in Chromium-based browsers">
                  Camera scan not available
                </span>
              )}
              <button type="button" className="catalog-btn catalog-btn-primary catalog-btn-barcode"
                onClick={() => void runIsbnLookup(form.isbn)}>
                Look up from ISBN
              </button>
            </div>

            {scannerHint ? <p className="catalog-scanner-hint">{scannerHint}</p> : null}
            {form.cover_image_url ? (
              <p className="catalog-scanner-hint">Cover found and will be saved with this book.</p>
            ) : normalizeIsbnForLookup(form.isbn) ? (
              <p className="catalog-scanner-hint">No cover found for this ISBN yet.</p>
            ) : null}

            {cameraScanOpen && CAN_USE_CAMERA_BARCODE ? (
              <div className="catalog-barcode-camera">
                <video ref={videoRef} className="catalog-barcode-video" muted playsInline autoPlay />
                <button type="button" className="catalog-btn catalog-btn-outline catalog-btn-barcode-stop"
                  onClick={() => setCameraScanOpen(false)}>Stop camera</button>
              </div>
            ) : null}

            <label className="catalog-form-label">Title *</label>
            <input className="catalog-form-input" value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />

            <label className="catalog-form-label">Author *</label>
            <input className="catalog-form-input" value={form.author}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))} />

            <label className="catalog-form-label">Shelf location</label>
            <input className="catalog-form-input" value={form.shelf_location}
              onChange={(e) => setForm((prev) => ({ ...prev, shelf_location: e.target.value }))} />

            <label className="catalog-form-label">Availability</label>
            <select className="catalog-form-input" value={form.status}
              onChange={(e) => setForm((prev) => ({
                ...prev, status: e.target.value === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
              }))}>
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
