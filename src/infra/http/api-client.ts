export type ApiError = {
  code: string;
  message: string;
};

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export class ApiClientError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(error: ApiError, status?: number) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = status;
  }
}

let hasLoggedApiBase = false;

function baseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  const normalized = raw.replace(/\/+$/, '');
  if (!hasLoggedApiBase) {
    hasLoggedApiBase = true;
    console.log('[api-client] EXPO_PUBLIC_API_BASE_URL =', normalized);
  }
  return normalized;
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    if ('ok' in json && json.ok === false) {
      throw new ApiClientError(json.error, response.status);
    }
    throw new ApiClientError(
      { code: 'HTTP_ERROR', message: `HTTP ${response.status}` },
      response.status,
    );
  }

  if ('ok' in json && json.ok === true) {
    return json.data;
  }

  if ('ok' in json && json.ok === false) {
    throw new ApiClientError(json.error, response.status);
  }

  throw new ApiClientError(
    { code: 'INVALID_RESPONSE', message: 'Unexpected API response' },
    response.status,
  );
}

type RequestOptions = {
  token?: string;
};

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getJson<T>(path: string, opts?: RequestOptions): Promise<T> {
  const url = `${baseUrl()}${path}`;
  console.log('[api-client] GET', url);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders(opts?.token) },
  });

  return parseEnvelope<T>(response);
}

export async function postJson<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  const url = `${baseUrl()}${path}`;
  console.log('[api-client] POST', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(opts?.token),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseEnvelope<T>(response);
}

export async function deleteJson<T>(path: string, opts?: RequestOptions): Promise<T> {
  const url = `${baseUrl()}${path}`;
  console.log('[api-client] DELETE', url);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...authHeaders(opts?.token) },
  });

  return parseEnvelope<T>(response);
}
