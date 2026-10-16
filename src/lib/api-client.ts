import axios, { AxiosError, AxiosHeaders } from "axios";

import { ApiError, type ApiResponse } from "../types/api";
import { getToken } from "./token-storage";

/**
 * In dev, Vite proxies `/api/*` to the Nest server (see vite.config.ts) —
 * the backend has no CORS configured, so this sidesteps that entirely.
 * In prod, point VITE_API_URL at the deployed API origin.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

/**
 * Fired whenever a request comes back 401. The auth context subscribes to
 * this to clear session state and redirect to /login — kept as a plain
 * event target instead of importing AuthContext here, so this module has
 * no dependency on React.
 */
export const authEvents = new EventTarget();

/** Extends axios' per-request config with our own `skipAuth` flag. */
declare module "axios" {
  export interface AxiosRequestConfig {
    /** Skip attaching the Authorization header (e.g. login/register). */
    skipAuth?: boolean;
  }
}

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = getToken();
    if (token) {
      const headers =
        config.headers instanceof AxiosHeaders
          ? config.headers
          : new AxiosHeaders(config.headers);
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown> | undefined>) => {
    const status = error.response?.status ?? 0;
    const messages = extractErrorMessages(error.response?.data, status);

    if (status === 401 && !error.config?.skipAuth) {
      authEvents.dispatchEvent(new CustomEvent("unauthorized"));
    }

    return Promise.reject(new ApiError(status, messages));
  }
);

/**
 * Success responses use `messages: string[]` (see `IResponse<T>`), but
 * errors thrown via `createHttpException` — and Nest's default validation
 * pipe — use the singular `message`, which can be a string or string[].
 * Normalize both shapes here so callers always get a string array.
 */
function extractErrorMessages(raw: unknown, status: number): string[] {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidate = obj.messages ?? obj.message;
    if (Array.isArray(candidate)) return candidate as string[];
    if (typeof candidate === "string") return [candidate];
  }
  return [`درخواست با خطا مواجه شد (${status}).`];
}

interface RequestOptions {
  /** Skip attaching the Authorization header (e.g. login/register). */
  skipAuth?: boolean;
  /**
   * Query-string params for GET requests (e.g. `GetUsersQueryDTO` filters
   * and pagination). `undefined` values are dropped by axios automatically,
   * so callers can pass a filter object as-is without pruning empty fields.
   */
  params?: Record<string, unknown>;
}

/** Unwraps the backend's `{ data: T, ... }` envelope down to just `T`. */
function unwrap<T>(response: { data: ApiResponse<T> | null }): T {
  // Backend has no 204-only endpoints today, but guard anyway.
  return (response.data?.data ?? null) as T;
}

/**
 * Raw axios instance, exported only for endpoints that don't return the
 * `ApiResponse<T>` JSON envelope — currently just `GET
 * /reports/:id/download`, which streams file bytes (see
 * `reportsApi.download`). Everything else should go through `apiClient`
 * below so responses stay unwrapped and errors stay normalized.
 */
export { http };

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    http
      .get<ApiResponse<T>>(path, {
        skipAuth: options?.skipAuth,
        params: options?.params,
      })
      .then(unwrap<T>),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    http
      .post<ApiResponse<T>>(path, body, { skipAuth: options?.skipAuth })
      .then(unwrap<T>),
  /** `multipart/form-data` upload (the browser sets the boundary). */
  postForm: <T>(path: string, form: FormData, options?: RequestOptions) =>
    http
      .postForm<ApiResponse<T>>(path, form, { skipAuth: options?.skipAuth })
      .then(unwrap<T>),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    http
      .put<ApiResponse<T>>(path, body, { skipAuth: options?.skipAuth })
      .then(unwrap<T>),
  delete: <T>(path: string, options?: RequestOptions) =>
    http
      .delete<ApiResponse<T>>(path, { skipAuth: options?.skipAuth })
      .then(unwrap<T>),
};
