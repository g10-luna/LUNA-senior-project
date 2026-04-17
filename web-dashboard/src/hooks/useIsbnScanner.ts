/**
 * useIsbnScanner – barcode scanner + ISBN metadata lookup hook
 *
 * Encapsulates all hardware I/O (camera stream, BarcodeDetector scan loop,
 * external USB/Bluetooth wedge scanner focus) and the debounced Open Library
 * ISBN metadata lookup. CatalogScreen becomes agnostic of camera APIs.
 *
 * Refactor rationale: Separation of Concerns.
 * Camera lifecycle management is entirely unrelated to book CRUD operations.
 * Keeping them in the same component made both harder to reason about and test.
 *
 * VIBE Human Correction:
 * The AI initially proposed `onIsbnScanned: (isbn: string) => void` (synchronous).
 * This was changed to `onIsbnScanned: (isbn: string) => Promise<void>` because
 * the ISBN lookup calls the Open Library API asynchronously — a synchronous
 * callback cannot surface loading state or propagate API errors back to the
 * caller's error boundary.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBookMetadataByIsbn, normalizeIsbnForLookup } from "../lib/isbnMetadataLookup";
import type { BookForm } from "./useCatalog";

// ---------------------------------------------------------------------------
// Browser capability guard
// ---------------------------------------------------------------------------

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
  const ctor =
    (typeof window !== "undefined" &&
      (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector) ||
    null;
  return ctor ?? null;
}

/** Strip whitespace / hyphens from a raw hardware scanner read. */
function normalizeIsbnFromScan(raw: string): string {
  return raw.trim().replace(/[\s-]/g, "");
}

// ---------------------------------------------------------------------------
// Props & return type
// ---------------------------------------------------------------------------

export type UseIsbnScannerProps = {
  /** Called with a normalised ISBN string once scanned or debounced. */
  onIsbnScanned: (isbn: string) => Promise<void>;
  /** Current form state – needed to react to ISBN field changes. */
  form: BookForm;
  /** Setter so the scanner can update the ISBN field on a successful scan. */
  setForm: React.Dispatch<React.SetStateAction<BookForm>>;
  /** Generation counter ref from useCatalog – bumped to cancel stale lookups. */
  isbnLookupGenRef: React.MutableRefObject<number>;
  /** Whether the add-book or edit-book modal is currently open. */
  modalOpen: boolean;
  /** The id of the book being edited, or null when adding. */
  editingBookId: string | null;
  /** Whether in add mode. */
  isAdding: boolean;
};

export type UseIsbnScannerReturn = {
  cameraScanOpen: boolean;
  scannerHint: string | null;
  setScannerHint: (hint: string | null) => void;
  setCameraScanOpen: (open: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isbnInputRef: React.RefObject<HTMLInputElement | null>;
  openCameraScanner: () => void;
  focusExternalBarcodeScanner: () => void;
  runIsbnLookup: (isbnRaw: string) => Promise<void>;
  CAN_USE_CAMERA_BARCODE: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** React import needed for the dispatch / ref types above. */
import type React from "react";

export function useIsbnScanner({
  onIsbnScanned,
  form,
  setForm,
  isbnLookupGenRef,
  modalOpen,
  editingBookId,
  isAdding,
}: UseIsbnScannerProps): UseIsbnScannerReturn {
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [scannerHint, setScannerHint] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isbnInputRef = useRef<HTMLInputElement>(null);
  const scanLoopRef = useRef<number>(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  // Tracks whether the next isbn change was caused by a scan (skip debounce)
  const skipIsbnDebounceRef = useRef(false);

  // ── ISBN metadata lookup ───────────────────────────────────────────────
  const runIsbnLookup = useCallback(
    async (isbnRaw: string) => {
      const normalized = normalizeIsbnForLookup(isbnRaw);
      if (!normalized) {
        setScannerHint("Enter a valid 10- or 13-digit ISBN to look up title and author.");
        return;
      }
      const gen = ++isbnLookupGenRef.current;
      setScannerHint("Looking up title and author…");
      try {
        const meta = await fetchBookMetadataByIsbn(normalized);
        if (gen !== isbnLookupGenRef.current) return; // stale – modal was closed
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
    },
    [isbnLookupGenRef, setForm]
  );

  // ── Camera scan lifecycle ──────────────────────────────────────────────
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
          setScannerHint(
            "Camera unavailable. Allow access or use an external USB scanner in the ISBN field."
          );
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
              // Delegate to the async callback – caller owns the lookup state
              await onIsbnScanned(scanned);
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
  }, [cameraScanOpen, onIsbnScanned, setForm]);

  // ── Debounced ISBN lookup on field change ──────────────────────────────
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

  // ── Reset scanner state when modal closes ──────────────────────────────
  useEffect(() => {
    if (!modalOpen) {
      setCameraScanOpen(false);
      setScannerHint(null);
    }
  }, [modalOpen]);

  // ── Public actions ─────────────────────────────────────────────────────
  const openCameraScanner = useCallback(() => {
    setScannerHint(null);
    if (!CAN_USE_CAMERA_BARCODE) {
      setScannerHint(
        "Camera barcode scanning isn't supported in this browser. Use an external scanner in the ISBN field."
      );
      return;
    }
    setCameraScanOpen(true);
  }, []);

  const focusExternalBarcodeScanner = useCallback(() => {
    setScannerHint(
      "USB / Bluetooth scanners: keep focus in the ISBN field, then scan (or type the code)."
    );
    window.requestAnimationFrame(() => {
      const el = isbnInputRef.current;
      el?.focus();
      el?.select();
    });
  }, []);

  return {
    cameraScanOpen,
    scannerHint,
    setScannerHint,
    setCameraScanOpen,
    videoRef,
    isbnInputRef,
    openCameraScanner,
    focusExternalBarcodeScanner,
    runIsbnLookup,
    CAN_USE_CAMERA_BARCODE,
  };
}
