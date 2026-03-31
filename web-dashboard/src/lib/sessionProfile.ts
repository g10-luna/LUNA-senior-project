const EMAIL_KEY = "luna_librarian_email";

/** Demo persona used across TopBar and Account (FT-only display). */
export const DEMO_LIBRARIAN_NAME = "Shirley Williams";
export const DEMO_LIBRARIAN_FIRST_NAME = "Shirley";
export const DEMO_LIBRARIAN_LAST_NAME = "Williams";
export const DEMO_LIBRARIAN_EMAIL = "shirley.williams@howard.edu";

export function getLibrarianDisplayName(): string {
  return DEMO_LIBRARIAN_NAME;
}

/** Email typed at login (sessionStorage), else demo address. No JWT/backend. */
export function getLibrarianDisplayEmail(): string {
  return getStoredLibrarianEmail() ?? DEMO_LIBRARIAN_EMAIL;
}

export function setLibrarianEmailAfterLogin(email: string) {
  sessionStorage.setItem(EMAIL_KEY, email.trim());
}

export function clearSessionProfile() {
  sessionStorage.removeItem(EMAIL_KEY);
}

function getStoredLibrarianEmail(): string | null {
  const v = sessionStorage.getItem(EMAIL_KEY);
  return v?.trim() ? v.trim() : null;
}
