import { apiFetch } from "./api";
import { USE_MOCK_AUTH } from "./appEnv";
import {
  clearCachedUserDisplayName,
  clearSessionProfile,
  MOCK_LIBRARIAN_PROFILE,
  setLibrarianEmailAfterLogin,
  setStoredUserProfile,
  type StoredUserProfile,
} from "./sessionProfile";
import { tokenStorage } from "./tokenStorage";

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
    setStoredUserProfile({ ...MOCK_LIBRARIAN_PROFILE });
    if (MOCK_LIBRARIAN_PROFILE.email) {
      setLibrarianEmailAfterLogin(MOCK_LIBRARIAN_PROFILE.email);
    }
    return { access_token: t, refresh_token: t };
  }
  const res = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    skipAuthRedirect: true,
    omitAuthHeader: true,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Invalid email or password"));
  }
  const body = (await res.json()) as Record<string, unknown>;
  if (body && typeof body === "object" && body.success === false) {
    const err = body.error as { message?: unknown } | undefined;
    const msg = typeof err?.message === "string" ? err.message : "Invalid email or password";
    throw new Error(msg);
  }
  const { access, refresh, user } = parseLoginPayload(body);
  if (!access) throw new Error("Invalid email or password");
  clearCachedUserDisplayName();
  // Drop any prior tab state (e.g. mock "Shirley" profile) before applying this session.
  clearSessionProfile();
  tokenStorage.setAccess(access);
  if (refresh) tokenStorage.setRefresh(refresh);
  const trimmedEmail = email.trim();
  if (user && (user.email || user.first_name || user.last_name || user.name)) {
    setStoredUserProfile(currentUserToStored(user));
  } else {
    setStoredUserProfile({ email: trimmedEmail });
  }
  return { access_token: access, refresh_token: refresh };
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  const res = await apiFetch("/api/v1/auth/refresh", {
    method: "POST",
    skipAuthRedirect: true,
    omitAuthHeader: true,
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
  clearCachedUserDisplayName();
};

export type CurrentUser = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role?: string;
  phone_number?: string | null;
  avatar_url?: string;
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
    avatar_url: typeof rec.avatar_url === "string" ? rec.avatar_url : undefined,
  };
}

function parseLoginPayload(json: Record<string, unknown>): {
  access: string | null;
  refresh: string | null;
  user: CurrentUser | null;
} {
  const { access, refresh } = parseTokenPayload(json);
  const data = (json.data && typeof json.data === "object" ? json.data : json) as Record<string, unknown>;
  const raw = data.user;
  const userRec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const user = userRec ? userFromApiRecord(userRec) : null;
  return { access, refresh, user };
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
    setStoredUserProfile({ ...MOCK_LIBRARIAN_PROFILE });
    if (MOCK_LIBRARIAN_PROFILE.email) {
      setLibrarianEmailAfterLogin(MOCK_LIBRARIAN_PROFILE.email);
    }
    return {
      id: MOCK_LIBRARIAN_PROFILE.id,
      email: MOCK_LIBRARIAN_PROFILE.email,
      first_name: MOCK_LIBRARIAN_PROFILE.first_name,
      last_name: MOCK_LIBRARIAN_PROFILE.last_name,
      role: MOCK_LIBRARIAN_PROFILE.role,
      phone_number: MOCK_LIBRARIAN_PROFILE.phone_number ?? null,
    };
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

export type UpdateCurrentUserInput = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
};

export async function updateCurrentUser(input: UpdateCurrentUserInput): Promise<CurrentUser> {
  const first_name = typeof input.firstName === "string" ? input.firstName.trim() : undefined;
  const last_name = typeof input.lastName === "string" ? input.lastName.trim() : undefined;
  const phone_number =
    input.phoneNumber === null
      ? null
      : typeof input.phoneNumber === "string"
        ? input.phoneNumber.trim()
        : undefined;

  if (USE_MOCK_AUTH) {
    const current = {
      ...MOCK_LIBRARIAN_PROFILE,
      first_name: first_name ?? MOCK_LIBRARIAN_PROFILE.first_name,
      last_name: last_name ?? MOCK_LIBRARIAN_PROFILE.last_name,
      phone_number: phone_number ?? MOCK_LIBRARIAN_PROFILE.phone_number ?? null,
    };
    setStoredUserProfile(current);
    return {
      id: current.id,
      email: current.email,
      first_name: current.first_name,
      last_name: current.last_name,
      role: current.role,
      phone_number: current.phone_number ?? null,
    };
  }

  const res = await apiFetch("/api/v1/auth/me", {
    method: "PUT",
    body: JSON.stringify({
      first_name,
      last_name,
      phone_number,
    }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Could not update profile."));
  }

  const json = (await res.json().catch(() => ({}))) as unknown;
  const top = asRecord(json);
  const data = top ? asRecord(top.data) : null;
  const userRec = data && "user" in data ? asRecord((data as { user: unknown }).user) : null;
  if (!userRec) throw new Error("Profile updated but response was invalid.");
  const user = userFromApiRecord(userRec);
  setStoredUserProfile(currentUserToStored(user));
  return user;
}

export async function uploadCurrentUserAvatar(file: File): Promise<CurrentUser> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image is too large. Please use a file under 2MB.");
  }
  if (USE_MOCK_AUTH) {
    return {
      id: MOCK_LIBRARIAN_PROFILE.id,
      email: MOCK_LIBRARIAN_PROFILE.email,
      first_name: MOCK_LIBRARIAN_PROFILE.first_name,
      last_name: MOCK_LIBRARIAN_PROFILE.last_name,
      role: MOCK_LIBRARIAN_PROFILE.role,
      phone_number: MOCK_LIBRARIAN_PROFILE.phone_number ?? null,
    };
  }
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await apiFetch("/api/v1/auth/me/avatar", {
    method: "PUT",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Could not upload profile photo."));
  }
  const json = (await res.json().catch(() => ({}))) as unknown;
  const top = asRecord(json);
  const data = top ? asRecord(top.data) : null;
  const userRec = data && "user" in data ? asRecord((data as { user: unknown }).user) : null;
  if (!userRec) throw new Error("Photo uploaded but response was invalid.");
  const user = userFromApiRecord(userRec);
  setStoredUserProfile(currentUserToStored(user));
  return user;
}

export type RegisterAccountInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: "LIBRARIAN" | "STUDENT";
};

export type RegisterAccountResult = {
  /** True when Supabase did not return a session (email confirmation required). */
  needsEmailConfirmation: boolean;
};

/**
 * Register a new account without signing the user in (no tokens stored).
 * Mock mode: validates only. Real mode: POST /api/v1/auth/register.
 */
export async function registerAccount(input: RegisterAccountInput): Promise<RegisterAccountResult> {
  const email = input.email.trim();
  const password = input.password;
  const first_name = input.firstName.trim();
  const last_name = input.lastName.trim();
  const role = input.role ?? "LIBRARIAN";
  if (!email || !password || !first_name || !last_name) {
    throw new Error("Please fill in all required fields.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (USE_MOCK_AUTH) {
    return { needsEmailConfirmation: false };
  }

  const res = await apiFetch("/api/v1/auth/register", {
    method: "POST",
    skipAuthRedirect: true,
    omitAuthHeader: true,
    body: JSON.stringify({
      email,
      password,
      first_name,
      last_name,
      phone_number: input.phone?.trim() || null,
      role,
    }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Unable to create account."));
  }
  const json = (await res.json()) as { data?: { access_token?: string | null; message?: string } };
  const access = json?.data?.access_token;
  const needsEmailConfirmation = typeof access !== "string" || access.length === 0;
  return { needsEmailConfirmation };
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
    omitAuthHeader: true,
    body: JSON.stringify({ email: trimmed }),
  });
  if (!res.ok) {
    throw new Error(await readHttpDetail(res, "Could not send reset email."));
  }
}
