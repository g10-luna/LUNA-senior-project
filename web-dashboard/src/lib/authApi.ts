import { apiFetch } from "./api";
import { clearSessionProfile } from "./sessionProfile";
import { tokenStorage } from "./tokenStorage";

// Use mock auth when explicitly set, or in dev when no API URL is configured
const USE_MOCK_AUTH =
  import.meta.env.VITE_USE_MOCK_AUTH === "true" ||
  (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL);

function parseTokenPayload(json: Record<string, unknown>) {
  const data = (json.data && typeof json.data === "object" ? json.data : json) as Record<string, unknown>;
  const a = data.access_token;
  const r = data.refresh_token;
  return { access: typeof a === "string" ? a : null, refresh: typeof r === "string" ? r : null };
}

export async function login(email: string, password: string) {
  if (USE_MOCK_AUTH) {
    const e = email?.trim() ?? "";
    const p = password?.trim() ?? "";
    if (!e || !p) throw new Error("Invalid credentials");
    const t = `mock_${Date.now()}`;
    tokenStorage.setAccess(t);
    tokenStorage.setRefresh(t);
    return { access_token: t, refresh_token: t };
  }
  const res = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    skipAuthRedirect: true,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const { access, refresh } = parseTokenPayload((await res.json()) as Record<string, unknown>);
  if (!access) throw new Error("Invalid credentials");
  tokenStorage.setAccess(access);
  if (refresh) tokenStorage.setRefresh(refresh);
  return { access_token: access, refresh_token: refresh };
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  const res = await apiFetch("/api/v1/auth/refresh", {
    method: "POST",
    skipAuthRedirect: true,
    headers: { Authorization: `Bearer ${refresh}` },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return null;
  const { access } = parseTokenPayload((await res.json()) as Record<string, unknown>);
  if (!access) return null;
  tokenStorage.setAccess(access);
  return access;
}

export const logout = () => {
  tokenStorage.clear();
  clearSessionProfile();
};

export type RegisterAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

async function readHttpDetail(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg: string }).msg)
            : String(item)
        )
        .join(" ");
    }
  } catch {
    /* ignore */
  }
  return text.trim() || fallback;
}

/**
 * Register a new account without signing the user in (no tokens stored).
 * Mock mode: validates only. Real mode: POST /api/v1/auth/register.
 */
export async function registerAccount(input: RegisterAccountInput): Promise<void> {
  const email = input.email.trim();
  const password = input.password;
  const first_name = input.firstName.trim();
  const last_name = input.lastName.trim();
  if (!email || !password || !first_name || !last_name) {
    throw new Error("Please fill in all required fields.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (USE_MOCK_AUTH) {
    return;
  }

  const res = await apiFetch("/api/v1/auth/register", {
    method: "POST",
    skipAuthRedirect: true,
    body: JSON.stringify({
      email,
      password,
      first_name,
      last_name,
      phone_number: input.phone?.trim() || null,
      role: "LIBRARIAN",
    }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Unable to create account."));
  }
}

/** Frontend-only: validates input; no API call (FT scope). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!currentPassword.trim()) throw new Error("Enter your current password.");
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
}

/** Frontend-only: validates email; no API call (FT scope). */
export async function requestPasswordResetEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Enter your email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Enter a valid email address.");
  }
}
