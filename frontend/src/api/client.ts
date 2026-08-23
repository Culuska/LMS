const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Thin fetch wrapper: attaches the bearer token (if present), parses JSON, and turns a
 * non-2xx response into a thrown ApiError with the backend's message — so callers get a
 * readable error instead of having to unwrap `response.ok` everywhere.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'message' in body) {
        const raw = (body as { message: unknown }).message;
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      }
    } catch {
      // response body wasn't JSON — fall back to statusText, already set above
    }
    throw new ApiError(response.status, message);
  }

  // Some endpoints (e.g. role removal) return 200/204 with no body at all — NestJS
  // doesn't force 204 just because a handler returns void. Read as text first so an
  // empty body doesn't throw trying to JSON-parse "".
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Two-step upload: `requestPath` registers the file's metadata with our backend and
 * gets back a short-lived presigned URL, then the raw bytes go straight to Cloudflare
 * R2 — never through our own API — via a plain unauthenticated PUT to that URL. See
 * backend/src/storage/storage.service.ts for the other half of this.
 */
export async function uploadFileResource<TResource>(
  requestPath: string,
  file: File,
): Promise<TResource> {
  const { resource, uploadUrl } = await api.post<{ resource: TResource; uploadUrl: string }>(
    requestPath,
    { fileName: file.name, contentType: file.type, sizeBytes: file.size },
  );

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new ApiError(uploadResponse.status, 'The file itself failed to upload — please try again.');
  }

  return resource;
}

/** A resource's download link is also presigned and short-lived — fetched fresh each
 * click rather than cached, so it can't go stale in a long-open tab. */
export async function downloadResource(resourceId: string): Promise<void> {
  const { url } = await api.get<{ url: string; fileName: string }>(`/resources/${resourceId}/download`);
  window.open(url, '_blank', 'noopener,noreferrer');
}
