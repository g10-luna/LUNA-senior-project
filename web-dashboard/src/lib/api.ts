import { refreshAccessToken } from "./authApi";
import { tokenStorage } from "./tokenStorage";
import { ROUTES } from "./routes";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type ApiOptions = RequestInit & {
  skipAuthRedirect?: boolean;
  /** Internal: already attempted refresh for this request */
  _retriedAfterRefresh?: boolean;
};

function redirectToLogin() {
  tokenStorage.clear();
  const params = new URLSearchParams({ session_expired: "1" });
  window.location.href = `${ROUTES.LOGIN}?${params.toString()}`;
}

export async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  const { skipAuthRedirect, _retriedAfterRefresh, ...rest } = options;
  const headers = new Headers(rest.headers);

  const token = tokenStorage.getAccess();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (rest.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${url}`, { ...rest, headers });
  } catch (e) {
    const baseHint = API_BASE_URL
      ? `Cannot reach ${API_BASE_URL}. Start the API gateway (e.g. cd backend/docker && docker compose up -d) and confirm port 8000 is open.`
      : "VITE_API_BASE_URL is not set. Add it to web-dashboard/.env (e.g. http://localhost:8000) and restart the Vite dev server.";
    const corsHint =
      " If the server is up, the browser may be blocking cross-origin requests until CORS is enabled on the backend.";
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
