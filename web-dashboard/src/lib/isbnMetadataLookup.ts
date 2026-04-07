/**
 * Open Library (free) metadata by ISBN — fills title / author in the catalog form.
 * Dev uses Vite proxy `/openlibrary` to avoid CORS issues.
 */
const OPEN_LIBRARY_BASE = import.meta.env.DEV ? "/openlibrary" : "https://openlibrary.org";

export type IsbnMetadata = {
  title: string;
  author: string;
  isbn: string;
  cover_image_url?: string;
};

/** Accept ISBN-10 (incl. check X) or ISBN-13 after trimming / hyphen removal. */
export function normalizeIsbnForLookup(raw: string): string | null {
  const s = raw.trim().replace(/[\s-]/g, "").toUpperCase();
  if (!s) return null;
  if (/^\d{13}$/.test(s)) return s;
  if (/^\d{9}[\dX]$/.test(s)) return s;
  return null;
}

export async function fetchBookMetadataByIsbn(isbnRaw: string, init?: RequestInit): Promise<IsbnMetadata | null> {
  const isbn = normalizeIsbnForLookup(isbnRaw);
  if (!isbn) return null;
  const key = `ISBN:${isbn}`;
  const url = `${OPEN_LIBRARY_BASE}/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;
  const res = await fetch(url, init);
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const entry = json[key];
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const authorsArr = Array.isArray(o.authors) ? o.authors : [];
  const author = authorsArr
    .map((a) => {
      if (!a || typeof a !== "object" || !("name" in a)) return "";
      const n = (a as { name?: unknown }).name;
      return typeof n === "string" ? n.trim() : "";
    })
    .filter(Boolean)
    .join(", ");
  const coverObj =
    o.cover && typeof o.cover === "object" ? (o.cover as Record<string, unknown>) : null;
  const cover_image_url =
    (coverObj && typeof coverObj.large === "string" ? coverObj.large : null) ||
    (coverObj && typeof coverObj.medium === "string" ? coverObj.medium : null) ||
    (coverObj && typeof coverObj.small === "string" ? coverObj.small : null) ||
    undefined;
  if (!title && !author) return null;
  return { title, author, isbn, cover_image_url };
}
