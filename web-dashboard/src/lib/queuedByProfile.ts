import { getLibrarianDisplayName } from "./sessionProfile";

/** Two-letter (or one) initials for avatar placeholder — no network images yet. */
export function displayNameToInitials(displayName: string): string {
  const raw = displayName.trim();
  if (!raw) return "?";
  if (raw.includes("@")) {
    const local = (raw.split("@")[0] ?? "").trim();
    const parts = local.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0] ?? "";
      const b = parts[1][0] ?? "";
      return (a + b).toUpperCase();
    }
    const w = parts[0] ?? local;
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w.charAt(0).toUpperCase();
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[parts.length - 1][0] ?? "";
    return (a + b).toUpperCase();
  }
  const w = parts[0] ?? raw;
  return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w.charAt(0).toUpperCase();
}

/** Snapshot of the logged-in librarian when they add a request manually. */
export function getCurrentQueuerProfile(): { queuedByName: string; queuedByInitials: string } {
  const queuedByName = getLibrarianDisplayName().trim() || "Librarian";
  return {
    queuedByName,
    queuedByInitials: displayNameToInitials(queuedByName),
  };
}

/** Shown on tasks created from robot telemetry (no human submitter). */
export const TELEMETRY_QUEUED_BY = {
  queuedByName: "Robot system",
  queuedByInitials: "RS",
} as const;
