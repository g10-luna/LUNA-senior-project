const EMAIL_KEY = "luna_librarian_email";
const PROFILE_KEY = "luna_user_profile";

/** TopBar caches display name in localStorage; clear on login/logout to avoid stale demo names. */
export const CACHED_USER_DISPLAY_NAME_KEY = "current_user_name";

export function clearCachedUserDisplayName() {
  try {
    localStorage.removeItem(CACHED_USER_DISPLAY_NAME_KEY);
  } catch {
    /* ignore */
  }
}

/** Demo persona when no API profile is cached (e.g. before /me loads). */
export const DEMO_LIBRARIAN_FIRST_NAME = "Shirley";
export const DEMO_LIBRARIAN_LAST_NAME = "Williams";
export const DEMO_LIBRARIAN_EMAIL = "shirley.williams@howard.edu";
export const DEMO_LIBRARIAN_NAME = [DEMO_LIBRARIAN_FIRST_NAME, DEMO_LIBRARIAN_LAST_NAME]
  .filter(Boolean)
  .join(" ")
  .trim();

export type StoredUserProfile = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  phone_number?: string | null;
};

/** Single mock logged-in user when `VITE_USE_MOCK_AUTH=true`; edit here only. */
export const MOCK_LIBRARIAN_PROFILE: StoredUserProfile = {
  id: "00000000-0000-4000-8000-000000000001",
  email: DEMO_LIBRARIAN_EMAIL,
  first_name: DEMO_LIBRARIAN_FIRST_NAME,
  last_name: DEMO_LIBRARIAN_LAST_NAME,
  role: "LIBRARIAN",
  phone_number: null,
};

function greetingTokenFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return DEMO_LIBRARIAN_FIRST_NAME;
  const word = local.replace(/[._-]+/g, " ").trim().split(/\s+/)[0] ?? "";
  if (!word) return DEMO_LIBRARIAN_FIRST_NAME;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** First name for greetings (“Good morning, …”) from session profile or demo defaults. */
export function getLibrarianGreetingFirstName(): string {
  const p = getStoredUserProfile();
  const first = p?.first_name?.trim();
  if (first) return first;
  const mail = p?.email?.trim() || getStoredLibrarianEmail()?.trim();
  if (mail) return greetingTokenFromEmail(mail);
  return DEMO_LIBRARIAN_FIRST_NAME;
}

export function setStoredUserProfile(user: StoredUserProfile | null) {
  if (!user) {
    sessionStorage.removeItem(PROFILE_KEY);
    return;
  }
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(user));
}

export function getStoredUserProfile(): StoredUserProfile | null {
  const raw = sessionStorage.getItem(PROFILE_KEY);
  if (!raw?.trim()) return null;
  try {
    const p = JSON.parse(raw) as StoredUserProfile;
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

export function getLibrarianDisplayName(): string {
  const p = getStoredUserProfile();
  if (p) {
    const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
    if (p.email) return p.email;
  }
  return DEMO_LIBRARIAN_NAME;
}

/** Email from cached profile, login field, or demo. */
export function getLibrarianDisplayEmail(): string {
  const p = getStoredUserProfile();
  if (p?.email) return p.email;
  return getStoredLibrarianEmail() ?? DEMO_LIBRARIAN_EMAIL;
}

export function setLibrarianEmailAfterLogin(email: string) {
  sessionStorage.setItem(EMAIL_KEY, email.trim());
}

export function clearSessionProfile() {
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(PROFILE_KEY);
}

function getStoredLibrarianEmail(): string | null {
  const v = sessionStorage.getItem(EMAIL_KEY);
  return v?.trim() ? v.trim() : null;
}
