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

/** Session cache for UI — omit phone_number (avoid clear-text sensitive storage in sessionStorage). */
export type StoredUserProfile = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

/** Single mock logged-in user when `VITE_USE_MOCK_AUTH=true`; edit here only. */
export const MOCK_LIBRARIAN_PROFILE: StoredUserProfile = {
  id: "00000000-0000-4000-8000-000000000001",
  email: DEMO_LIBRARIAN_EMAIL,
  first_name: DEMO_LIBRARIAN_FIRST_NAME,
  last_name: DEMO_LIBRARIAN_LAST_NAME,
  role: "LIBRARIAN",
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
  const safe: StoredUserProfile = {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
  };
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(safe));
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
  const loginEmail = getStoredLibrarianEmail();
  if (loginEmail) return loginEmail;
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

/** Profile cache and/or email saved at login — for TopBar until /me returns. */
export function hasLibrarianSessionHint(): boolean {
  return getStoredUserProfile() != null || getStoredLibrarianEmail() != null;
}
