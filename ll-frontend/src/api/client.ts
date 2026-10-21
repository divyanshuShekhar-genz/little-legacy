import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'll-admin-token';

/**
 * "Remember me" → localStorage (survives closing the browser; token lasts 7 days).
 * Otherwise → sessionStorage (cleared when the browser closes; token lasts 12 hours).
 */
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY),
  set: (token: string, remember: boolean) => {
    tokenStore.clear();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

/** Single HTTP client for the admin panel. Every feature's api.ts goes through this. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** Fetches a JSON export with auth and saves it as a file. */
export async function downloadJson(path: string, filename: string) {
  const { data } = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

/** API errors are `{ error: { message, details? } }` — see ll-backend/src/common/filters/http-exception.filter.ts. */
export function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as { error?: { message?: string } } | undefined;
    if (body?.error?.message) return body.error.message;
    // No API error body: the request never reached our backend (it's down, or the dev proxy
    // couldn't connect and answered with a bare 5xx).
    if (!error.response || error.response.status >= 500) {
      return 'Can’t reach the server. Check the backend is running, then try again.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
