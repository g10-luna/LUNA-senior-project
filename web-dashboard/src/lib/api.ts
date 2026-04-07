import { refreshAccessToken } from "./authApi";
import { ROUTES } from "./routes";
import { clearCachedUserDisplayName, clearSessionProfile } from "./sessionProfile";
import { tokenStorage } from "./tokenStorage";

// In dev, default to "" so requests hit Vite's dev server and are proxied to the gateway
// (see `vite.config.ts`). Set `VITE_API_BASE_URL` to override (e.g. http://localhost:8000).
// In production builds, default to the gateway URL unless overridden.
const rawBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  rawBase !== undefined && rawBase !== ""
    ? rawBase
    : import.meta.env.DEV
      ? ""
      : "http://localhost:8000";

type ApiOptions = RequestInit & {
  skipAuthRedirect?: boolean;
  /** Do not send Bearer token (login, register, etc.). */
  omitAuthHeader?: boolean;
  /** Internal: already attempted refresh for this request */
  _retriedAfterRefresh?: boolean;
};

function redirectToLogin() {
  tokenStorage.clear();
  clearSessionProfile();
  clearCachedUserDisplayName();
  const params = new URLSearchParams({ session_expired: "1" });
  window.location.href = `${ROUTES.LOGIN}?${params.toString()}`;
}

export async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  const { skipAuthRedirect, omitAuthHeader, _retriedAfterRefresh, ...rest } = options;
  const headers = new Headers(rest.headers);

  const token = tokenStorage.getAccess();
  // Keep caller-provided Authorization (e.g. refresh token request) intact.
  if (token && !omitAuthHeader && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (rest.body && !(rest.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${url}`, { ...rest, headers });
  } catch (e) {
    const baseHint = API_BASE_URL
      ? `Cannot reach ${API_BASE_URL}. Start the API gateway on port 8000.`
      : import.meta.env.DEV
        ? "Cannot reach API via Vite proxy. Start the gateway on http://127.0.0.1:8000 and restart `npm run dev`."
        : "Set VITE_API_BASE_URL in web-dashboard/.env and rebuild.";
    const corsHint =
      API_BASE_URL && import.meta.env.DEV
        ? " Tip: in dev, remove VITE_API_BASE_URL to use the Vite proxy and avoid CORS."
        : "";
    if (e instanceof TypeError) {
      throw new Error(`Network error: failed to fetch. ${baseHint}${corsHint}`);
    }
    throw e;
  }

  if (res.status === 401 && !skipAuthRedirect) {
    if (!_retriedAfterRefresh) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiFetch(url, { ...options, _retriedAfterRefresh: true });
      }
    }
    redirectToLogin();
  }

  return res;
}
