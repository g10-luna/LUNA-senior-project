import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createBook, deleteBook, listBooks, updateBook } from "../lib/catalogApi";
import type { Book } from "../lib/catalogTypes";
import { fetchBookMetadataByIsbn, normalizeIsbnForLookup } from "../lib/isbnMetadataLookup";
import "./Catalog.css";

const CAN_USE_CAMERA_BARCODE =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  "BarcodeDetector" in window;

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

function getBarcodeDetectorCtor(): BarcodeDetectorConstructor | null {
  const ctor = (typeof window !== "undefined" && (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector) || null;
  return ctor ?? null;
}

/** Normalize ISBN / EAN digits from a hardware scanner or camera. */
function normalizeIsbnFromScan(raw: string): string {
  return raw.trim().replace(/[\s-]/g, "");
}

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
  cover_image_url?: string | null;
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

function getPaginationWindow(currentPage: number, totalPages: number): number[] {
  const windowSize = 7;
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
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
    cover_image_url: null,
  });
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [scannerHint, setScannerHint] = useState<string | null>(null);
  const isbnInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLoopRef = useRef<number>(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const isbnLookupGenRef = useRef(0);
  const skipIsbnDebounceRef = useRef(false);

  const runIsbnLookup = useCallback(async (isbnRaw: string) => {
    const normalized = normalizeIsbnForLookup(isbnRaw);
    if (!normalized) {
      setScannerHint("Enter a valid 10- or 13-digit ISBN to look up title and author.");
      return;
    }
    const gen = ++isbnLookupGenRef.current;
    setScannerHint("Looking up title and author…");
    try {
      const meta = await fetchBookMetadataByIsbn(normalized);
      if (gen !== isbnLookupGenRef.current) return;
      if (meta) {
        setForm((prev) => ({
          ...prev,
          isbn: meta.isbn,
          title: meta.title || prev.title,
          author: meta.author || prev.author,
          cover_image_url: meta.cover_image_url ?? prev.cover_image_url ?? null,
        }));
        setScannerHint("Filled title, author, ISBN, and cover (when available).");
      } else {
        setScannerHint("No match for this ISBN — enter title and author manually.");
      }
    } catch {
      if (gen !== isbnLookupGenRef.current) return;
      setScannerHint("Lookup failed. Try again or enter details manually.");
    }
  }, []);

  const addParam = searchParams.get("add");

  useEffect(() => {
    if (addParam === "1") {
      setIsAdding(true);
      setEditingBookId(null);
      setMutationError(null);
    }
  }, [addParam]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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

  const filteredBooks = useMemo(() => {
    if (statusFilter !== "low_stock") return books;
    return books.filter((b: Book) => getStatusFlags(b).isLowStock);
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
        cover_image_url: editingBook.cover_image_url ?? null,
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
        cover_image_url: null,
      });
    }
  }, [isAdding]);

  useEffect(() => {
    if (!cameraScanOpen) return;
    const ctor = getBarcodeDetectorCtor();
    const video = videoRef.current;
    if (!ctor || !video) return;

    let cancelled = false;
    const detector = new ctor({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
    });

    const stopTracks = () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const stopLoop = () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = 0;
    };

    const stopAll = () => {
      cancelled = true;
      stopLoop();
      stopTracks();
    };

    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        if (!cancelled) {
          setScannerHint("Camera unavailable. Allow access or use an external USB scanner in the ISBN field.");
          setCameraScanOpen(false);
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      cameraStreamRef.current = stream;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        if (!cancelled) {
          setScannerHint("Could not start the camera preview.");
          stopAll();
          setCameraScanOpen(false);
        }
        return;
      }

      const loop = async () => {
        if (cancelled) return;
        if (video.readyState >= 2) {
          try {
            const codes = await detector.detect(video);
            const raw = codes[0]?.rawValue;
            if (raw && !cancelled) {
              const scanned = normalizeIsbnFromScan(raw);
              skipIsbnDebounceRef.current = true;
              setForm((prev) => ({ ...prev, isbn: scanned }));
              stopAll();
              setCameraScanOpen(false);
              void runIsbnLookup(scanned);
              isbnInputRef.current?.focus();
              return;
            }
          } catch {
            /* ignore single-frame detect errors */
          }
        }
        scanLoopRef.current = requestAnimationFrame(() => void loop());
      };
      scanLoopRef.current = requestAnimationFrame(() => void loop());
    })();

    return () => {
      cancelled = true;
      stopLoop();
      stopTracks();
    };
  }, [cameraScanOpen, runIsbnLookup]);

  /** After ISBN changes (typing or wedge scanner), look up metadata once it’s a valid length. */
  useEffect(() => {
    if (!isAdding && !editingBookId) return;
    if (skipIsbnDebounceRef.current) {
      skipIsbnDebounceRef.current = false;
      return;
    }
    if (!normalizeIsbnForLookup(form.isbn)) return;
    const t = window.setTimeout(() => {
      void runIsbnLookup(form.isbn);
    }, 650);
    return () => clearTimeout(t);
  }, [form.isbn, isAdding, editingBookId, runIsbnLookup]);

  const focusExternalBarcodeScanner = () => {
    setScannerHint("USB / Bluetooth scanners: keep focus in the ISBN field, then scan (or type the code).");
    window.requestAnimationFrame(() => {
      const el = isbnInputRef.current;
      el?.focus();
      el?.select();
    });
  };

  const openCameraScanner = () => {
    setScannerHint(null);
    if (!CAN_USE_CAMERA_BARCODE) {
      setScannerHint("Camera barcode scanning isn’t supported in this browser. Use an external scanner in the ISBN field.");
      return;
    }
    setCameraScanOpen(true);
  };

  const canPrev = page > 1;
  const canNext = totalPages ? page < totalPages : books.length === PAGE_SIZE;
  const pageWindow = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [];
    return getPaginationWindow(page, totalPages);
  }, [page, totalPages]);

  const closeModal = () => {
    isbnLookupGenRef.current += 1;
    setCameraScanOpen(false);
    setScannerHint(null);
    setIsAdding(false);
    setEditingBookId(null);
    setMutationError(null);
    clearAddParam();
  };

  const onSave = async () => {
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
          // Preserve metadata fields not editable in this modal.
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
  };

  const onDelete = async (bookId: string) => {
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
            <button type="button" className="catalog-add-btn" onClick={() => setRefreshToken((n) => n + 1)}>
              Refresh
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

      {loading ? <p className="catalog-loading">Loading catalog...</p> : null}
      {error ? <p className="catalog-empty" style={{ color: "var(--red)" }}>{error}</p> : null}
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
                {book.cover_image_url ? (
                  <img
                    className="catalog-card-cover"
                    src={book.cover_image_url}
                    alt={`Cover for ${book.title || "book"}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (next) next.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="catalog-card-icon" aria-hidden style={{ display: book.cover_image_url ? "none" : "flex" }}>
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

      <div className="card catalog-pagination-wrap">
        <button type="button" className="catalog-btn catalog-btn-outline" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="catalog-card-meta">
          Page {page}
          {totalPages ? ` of ${totalPages}` : ""}
        </span>
        {pageWindow.length > 0 ? (
          <div className="catalog-page-numbers">
            {pageWindow.map((p) => (
              <button
                key={p}
                type="button"
                className={`catalog-btn catalog-btn-outline${p === page ? " catalog-page-number--active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}
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
          <div className={`catalog-modal${cameraScanOpen ? " catalog-modal--scanner" : ""}`}>
            <h2 className="catalog-modal-title">{isAdding ? "Add book" : "Edit book"}</h2>
            {mutationError ? (
              <p className="catalog-empty" style={{ color: "var(--red)", marginBottom: "12px" }}>
                {mutationError}
              </p>
            ) : null}

            <label className="catalog-form-label" id="catalog-isbn-label">
              ISBN *
            </label>
            <p className="catalog-isbn-hint">
              Scan or type an ISBN — we&apos;ll look up <strong>title</strong> and <strong>author</strong> from Open Library when possible
              (camera, external scanner, or <strong>Look up from ISBN</strong> below).
            </p>
            <input
              ref={isbnInputRef}
              className="catalog-form-input catalog-isbn-input"
              value={form.isbn}
              onChange={(e) => setForm((prev) => ({ ...prev, isbn: e.target.value }))}
              autoComplete="off"
              spellCheck={false}
              aria-labelledby="catalog-isbn-label"
            />
            <div className="catalog-barcode-actions">
              <button
                type="button"
                className="catalog-btn catalog-btn-outline catalog-btn-barcode"
                onClick={focusExternalBarcodeScanner}
              >
                External scanner
              </button>
              {CAN_USE_CAMERA_BARCODE ? (
                <button
                  type="button"
                  className="catalog-btn catalog-btn-outline catalog-btn-barcode"
                  onClick={openCameraScanner}
                  disabled={cameraScanOpen}
                >
                  {cameraScanOpen ? "Camera on…" : "Use camera"}
                </button>
              ) : (
                <span className="catalog-barcode-unsupported" title="Supported in Chromium-based browsers">
                  Camera scan not available
                </span>
              )}
              <button
                type="button"
                className="catalog-btn catalog-btn-primary catalog-btn-barcode"
                onClick={() => void runIsbnLookup(form.isbn)}
              >
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
                <button
                  type="button"
                  className="catalog-btn catalog-btn-outline catalog-btn-barcode-stop"
                  onClick={() => {
                    setCameraScanOpen(false);
                  }}
                >
                  Stop camera
                </button>
              </div>
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
