/**
 * Cover image URL helpers.
 * Open Library URLs use -S (small), -M (medium), -L (large); we use -M for
 * list/card thumbnails to reduce load time and bandwidth.
 */
export type CoverSize = 'thumbnail' | 'full';

export function getCoverUrl(
  coverImageUrl: string | null | undefined,
  size: CoverSize
): string | null {
  const url = coverImageUrl?.trim();
  if (!url) return null;
  if (size === 'full') return url;
  // Open Library: .../b/id/123-L.jpg -> use -M for thumbnail
  if (url.includes('-L.jpg')) return url.replace(/-L\.jpg$/, '-M.jpg');
  if (url.includes('-L.webp')) return url.replace(/-L\.webp$/, '-M.webp');
  return url;
}
