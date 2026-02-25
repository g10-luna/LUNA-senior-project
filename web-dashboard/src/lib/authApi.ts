import { apiFetch } from "./api";
import { tokenStorage } from "./tokenStorage";

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
    if (!email.trim() || !password.trim()) throw new Error("Invalid credentials");
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
