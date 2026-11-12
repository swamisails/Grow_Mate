// The SPA's only HTTP client (AD-1): relative calls on the shared origin, Sanctum cookie session (AD-9).

/** Every API response body: `{ data: ... }` (AD-10). */
export type Resource<T> = { data: T }

/** The one API error shape (AD-10). */
export type ApiErrorBody = {
  message: string
  code?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly errors?: Record<string, string[]>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.errors = body.errors
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** The boot-time session check: its 401 only means "signed out", not "session lost". */
const SESSION_CHECK = '/api/v1/me'

let unauthorizedListener: (() => void) | null = null

/**
 * Called whenever an API call answers 401 (the session expired or was never there), except the
 * boot-time `GET /api/v1/me`. Returns a function that removes the listener.
 */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListener = listener
  return () => {
    if (unauthorizedListener === listener) {
      unauthorizedListener = null
    }
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const xsrf = readCookie('XSRF-TOKEN')
  if (xsrf) {
    headers['X-XSRF-TOKEN'] = xsrf
  }

  const response = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && !(method === 'GET' && path === SESSION_CHECK)) {
      unauthorizedListener?.()
    }
    const errorBody =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as ApiErrorBody)
        : { message: response.statusText }
    throw new ApiError(response.status, errorBody)
  }

  return payload as T
}

/** Sets the XSRF-TOKEN cookie; call before the first state-changing request of a session. */
export async function fetchCsrfCookie(): Promise<void> {
  await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
}
