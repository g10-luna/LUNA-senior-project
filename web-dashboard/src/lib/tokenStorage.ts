import { USE_MOCK_AUTH } from "./appEnv";

const ACCESS = "access_token";
const REFRESH = "refresh_token";

function readJwtExpMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1])) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function hasUsableAccessToken(token: string | null): boolean {
  if (!token) return false;
  if (token.startsWith("mock_")) return USE_MOCK_AUTH;
  const expMs = readJwtExpMs(token);
  if (expMs == null) return true;
  return Date.now() < expMs;
}

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS),
  setAccess: (t: string) => localStorage.setItem(ACCESS, t),
  getRefresh: () => localStorage.getItem(REFRESH),
  setRefresh: (t: string) => localStorage.setItem(REFRESH, t),
  clear: () => { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); },
  isAuthenticated: () => {
    const access = localStorage.getItem(ACCESS);
    const ok = hasUsableAccessToken(access);
    if (!ok) {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
    }
    return ok;
  },
};