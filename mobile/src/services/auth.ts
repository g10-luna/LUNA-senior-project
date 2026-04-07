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
  const base = getApiUrl().replace(/\/$/, '');
  const token = await getAccessToken();
  if (!token?.trim()) throw new Error('Not authenticated');
  const res = await fetch(`${base}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  });
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
  const base = getApiUrl().replace(/\/$/, '');
  const token = await getAccessToken();
  if (!token?.trim()) throw new Error('Not authenticated');
  const res = await fetch(`${base}/api/v1/auth/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(updates),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json?.detail === 'string' ? json.detail : 'Update failed');
  if (json.success === false) throw new Error('Update failed');
  const user = json?.data?.user;
  if (!user) throw new Error('Invalid profile response');
  return user as MeUser;
}
