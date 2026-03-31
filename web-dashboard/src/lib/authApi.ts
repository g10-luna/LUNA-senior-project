import { apiFetch } from "./api";
import { tokenStorage } from "./tokenStorage";

// Mock auth only when explicitly enabled (dev often uses Vite proxy with no VITE_API_BASE_URL).
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === "true";

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

export const logout = () => tokenStorage.clear();

export type CurrentUser = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role?: string;
  phone_number?: string | null;
};

/** Full name or email for UI (top bar, account). */
export function displayNameFromCurrentUser(user: CurrentUser | null | undefined): string {
  if (!user) return "";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || user.name || user.email || "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeMePayload(data: Record<string, unknown> | null): CurrentUser | null {
  if (!data) return null;
  const nested = asRecord(data.user);
  const src = nested ?? data;
  const id = src.id;
  const email = src.email;
  const first_name = src.first_name;
  const last_name = src.last_name;
  const name = src.name;
  const role = src.role;
  const phone_number = src.phone_number;
  return {
    id: typeof id === "string" ? id : undefined,
    email: typeof email === "string" ? email : undefined,
    first_name: typeof first_name === "string" ? first_name : undefined,
    last_name: typeof last_name === "string" ? last_name : undefined,
    name: typeof name === "string" ? name : undefined,
    role: typeof role === "string" ? role : undefined,
    phone_number: typeof phone_number === "string" ? phone_number : phone_number === null ? null : undefined,
  };
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (USE_MOCK_AUTH) {
    return {
      first_name: "Librarian",
      last_name: "User",
      email: "librarian@example.edu",
      role: "LIBRARIAN",
    };
  }

  const res = await apiFetch("/api/v1/auth/me");
  if (!res.ok) return null;

  const json = (await res.json().catch(() => ({}))) as unknown;
  const top = asRecord(json);
  if (!top) return null;
  const data = asRecord(top.data);
  return normalizeMePayload(data);
}

export type RegisterAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

async function readRegisterError(res: Response): Promise<string> {
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
  return text.trim() || "Unable to create account.";
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
    throw new Error(await readRegisterError(res));
  }
}
