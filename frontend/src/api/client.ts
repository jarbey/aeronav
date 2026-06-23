import { LS_TOKEN, useAuthStore } from '../stores/authStore';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    // Token expired or rejected by the API → end the session and send the user
    // back to the login screen. (403 = forbidden action, NOT an auth failure,
    // so it is left to the caller and never logs the user out.)
    useAuthStore.getState().expireSession();
    throw new Error('API 401: session expirée');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  // 204 No Content — return undefined without trying to parse JSON
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
