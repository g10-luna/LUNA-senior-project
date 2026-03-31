import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'luna_access_token';
const REFRESH_TOKEN_KEY = 'luna_refresh_token';

export const getApiUrl = (): string =>
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/** Serialize refresh so concurrent 401s do not spawn parallel refresh calls (FS-11 / sprint auth hardening). */
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshSessionWithLock(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const base = getApiUrl().replace(/\/$/, '');
        const rt = await getRefreshToken();
        if (!rt?.trim()) return false;
        const res = await fetch(`${base}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          await clearTokens();
          return false;
        }
        const payload = data?.data ?? data;
        const accessToken = payload?.access_token;
        const newRefresh = payload?.refresh_token;
        if (!accessToken || !newRefresh) {
          await clearTokens();
          return false;
        }
        await setTokens(accessToken, newRefresh);
        return true;
      } catch {
        await clearTokens().catch(() => {});
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Authenticated JSON request with optional body. On 401, tries one token refresh then retries once.
 * Matches gateway `{ success, data }` error patterns for non-JSON failures.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
  isRetryAfterRefresh = false
): Promise<Response> {
  const base = getApiUrl().replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const token = await getAccessToken();
  const headers: HeadersInit = {
    ...(init?.headers as Record<string, string>),
  };
  const hasBody = init?.body != null && init?.body !== '';
  if (hasBody && !(headers as Record<string, string>)['Content-Type']) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  if (token?.trim()) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token.trim()}`;
  }
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && !isRetryAfterRefresh) {
    const refreshed = await refreshSessionWithLock();
    if (refreshed) return apiFetch(path, init, true);
  }
  return res;
}

/** Current user profile from GET /api/v1/auth/me */
export interface MeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'STUDENT' | 'LIBRARIAN' | 'ADMIN';
  phone_number: string | null;
}

export async function getMe(): Promise<MeUser> {
  const res = await apiFetch('/api/v1/auth/me');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json?.detail === 'string' ? json.detail : 'Failed to load profile');
  if (json.success === false) throw new Error('Failed to load profile');
  const user = json?.data?.user;
  if (!user) throw new Error('Invalid profile response');
  return user as MeUser;
}

/** Update profile via PUT /api/v1/auth/me. Only provided fields are updated. */
export async function updateMe(updates: {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
}): Promise<MeUser> {
  const res = await apiFetch('/api/v1/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json?.detail === 'string' ? json.detail : 'Update failed');
  if (json.success === false) throw new Error('Update failed');
  const user = json?.data?.user;
  if (!user) throw new Error('Invalid profile response');
  return user as MeUser;
}
