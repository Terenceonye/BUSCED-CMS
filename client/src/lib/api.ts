/**
 * Thin fetch wrapper around the existing Express API.
 *
 * The server accepts a Bearer token on every /api route (see
 * middlewares/authMiddleware.js), so the SPA authenticates with the JWT it
 * stores at login. A 401 clears the token and bounces to the login screen.
 */

const TOKEN_KEY = "token";
const USER_KEY = "user";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user ?? null));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** Plain object is JSON-encoded; FormData is passed through untouched. */
  body?: unknown;
  /** Skip the automatic redirect-to-login on 401 (used by the login call). */
  allowUnauthorized?: boolean;
};

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T = any>(
  path: string,
  { body, headers, allowUnauthorized, ...init }: RequestOptions = {},
): Promise<T> {
  const token = getToken();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined && !isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: finalHeaders,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error - could not reach the server.", 0);
  }

  if (res.status === 401 && !allowUnauthorized) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  // Some endpoints (redirects, empty deletes) return no JSON body.
  const text = await res.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && (payload.message || payload.error)) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(String(message), res.status, payload);
  }

  return payload as T;
}

export const get = <T = any>(path: string) => api<T>(path);
export const post = <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
  api<T>(path, { ...opts, method: "POST", body });
export const put = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: "PUT", body });
export const patch = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: "PATCH", body });
export const del = <T = any>(path: string) => api<T>(path, { method: "DELETE" });
