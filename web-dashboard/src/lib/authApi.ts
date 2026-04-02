import { apiFetch } from "./api";
import { clearSessionProfile, setStoredUserProfile, type StoredUserProfile } from "./sessionProfile";
import { tokenStorage } from "./tokenStorage";

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

export const logout = () => {
  tokenStorage.clear();
  clearSessionProfile();
};

export type CurrentUser = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role?: string;
  phone_number?: string | null;
};

function userFromApiRecord(rec: Record<string, unknown>): CurrentUser {
  return {
    id: rec.id != null ? String(rec.id) : undefined,
    email: typeof rec.email === "string" ? rec.email : undefined,
    first_name: typeof rec.first_name === "string" ? rec.first_name : undefined,
    last_name: typeof rec.last_name === "string" ? rec.last_name : undefined,
    name: typeof rec.name === "string" ? rec.name : undefined,
    role: typeof rec.role === "string" ? rec.role : undefined,
    phone_number:
      typeof rec.phone_number === "string"
        ? rec.phone_number
        : rec.phone_number === null
          ? null
          : undefined,
  };
}

export function currentUserToStored(user: CurrentUser): StoredUserProfile {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    phone_number: user.phone_number ?? null,
  };
}

export function displayNameFromCurrentUser(user: CurrentUser): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || user.name || user.email || "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (USE_MOCK_AUTH) {
    const u: CurrentUser = {
      first_name: "Librarian",
      last_name: "User",
      email: "librarian@example.edu",
      role: "LIBRARIAN",
    };
    setStoredUserProfile(currentUserToStored(u));
    return u;
  }

  const res = await apiFetch("/api/v1/auth/me");
  if (!res.ok) return null;

  const json = (await res.json().catch(() => ({}))) as unknown;
  const top = asRecord(json);
  if (!top) return null;
  const data = asRecord(top.data);
  const userRec = data && "user" in data ? asRecord((data as { user: unknown }).user) : null;
  if (userRec) {
    const user = userFromApiRecord(userRec);
    if (user.email || user.first_name) setStoredUserProfile(currentUserToStored(user));
    return user;
  }
  if (data && typeof data.email === "string") {
    return userFromApiRecord(data);
  }
  return null;
}

export type RegisterAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

async function readHttpDetail(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  const status = res.status;
  if (status === 502 || status === 503 || status === 504) {
    const head = text.slice(0, 600).toLowerCase();
    if (head.includes("<html") || head.includes("bad gateway") || head.includes("service unavailable")) {
      return "The API gateway could not reach the auth service (502/503). Start the stack from backend/docker with docker compose up -d, then run docker logs luna-auth-service if it still fails.";
    }
  }
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

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!currentPassword.trim()) throw new Error("Enter your current password.");
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  if (USE_MOCK_AUTH) return;

  const res = await apiFetch("/api/v1/auth/change-password", {
    method: "PUT",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Could not update password."));
  }
}

export async function requestPasswordResetEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Enter your email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Enter a valid email address.");
  }
  if (USE_MOCK_AUTH) return;

  const res = await apiFetch("/api/v1/auth/forgot-password", {
    method: "POST",
    skipAuthRedirect: true,
    body: JSON.stringify({ email: trimmed }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Could not send reset email."));
  }
}
