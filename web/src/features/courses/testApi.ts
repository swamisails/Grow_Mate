// Test helpers: a fetch stub answering `METHOD /path` keys, and a signed-in Admin.
import { vi } from 'vitest'

export const admin = { id: 1, name: 'Noor', email: 'noor@example.com', is_admin: true }

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export type Handler = (body: unknown) => Response

/**
 * Answers `GET /api/v1/me` with the Admin, and each `"METHOD /path"` from `routes`; anything else
 * answers 404. Returns the fetch mock, whose calls record every request.
 */
export function stubApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const method = init?.method ?? 'GET'
    if (method === 'GET' && path === '/api/v1/me') {
      return jsonResponse(200, { data: admin })
    }
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return routes[`${method} ${path}`]?.(body) ?? jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The `"METHOD /path"` of every request made so far, in order. */
export function requests(fetchMock: ReturnType<typeof stubApi>): string[] {
  return fetchMock.mock.calls.map(([input, init]) => `${init?.method ?? 'GET'} ${String(input)}`)
}
