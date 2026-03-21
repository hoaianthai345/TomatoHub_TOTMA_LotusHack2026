const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
const API_BASE_URL = /\/api\/v\d+$/i.test(normalizedApiBaseUrl)
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api/v1`;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+$/i, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestJsonOptions extends RequestInit {
  token?: string;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function resolveApiAssetUrl(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (
    /^https?:\/\//i.test(trimmed) ||
    /^\/\//.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (!API_ORIGIN) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

function buildHeaders(init?: RequestInit, token?: string): Headers {
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
      const firstIssue = payload.detail[0];
      if (typeof firstIssue?.msg === "string") {
        return firstIssue.msg;
      }
    }
    if (typeof payload?.message === "string") {
      return payload.message;
    }
  } catch {
    // Ignore parse errors and fall back to status text.
  }

  return response.statusText || "Request failed";
}

export async function requestJson<T>(
  path: string,
  { token, cache = "no-store", ...init }: RequestJsonOptions = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache,
    headers: buildHeaders(init, token),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}
