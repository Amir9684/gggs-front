/**
 * The backend hands back a plain bearer token in the JSON body (no
 * httpOnly cookie support), so localStorage is the only place a SPA can
 * hold it. Centralized here so the storage strategy is a one-file change
 * later if that ever needs to move to a cookie-based flow.
 */
const TOKEN_KEY = 'gggs_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}