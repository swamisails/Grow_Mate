import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, onUnauthorized } from '../api/client'
import { returnPath, signInPath, useSession } from './session'
import { SessionProvider } from './SessionProvider'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('returnPath', () => {
  it('accepts a same-origin path', () => {
    expect(returnPath('?return=/admin/courses')).toBe('/admin/courses')
    expect(returnPath('?return=%2Fadmin%2Fcourses%3Fx%3D1')).toBe('/admin/courses?x=1')
  })

  it('round-trips what signInPath builds', () => {
    const signIn = new URL(signInPath('/admin/courses?x=1'), 'http://localhost')
    expect(returnPath(signIn.search)).toBe('/admin/courses?x=1')
  })

  it.each([
    ['missing', ''],
    ['empty', '?return='],
    ['protocol-relative', '?return=//evil.com'],
    ['encoded protocol-relative', '?return=%2F%2Fevil.com'],
    ['backslash protocol-relative', '?return=/%5Cevil.com'],
    ['absolute', '?return=https://evil.com/admin/courses'],
    ['javascript', '?return=javascript:alert(1)'],
    ['relative, not starting with /', '?return=admin/courses'],
  ])('rejects a %s return path', (_label, search) => {
    expect(returnPath(search)).toBeNull()
  })
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('the 401 listener', () => {
  it('fires on a 401 from any call except the boot-time GET /api/v1/me', async () => {
    const listener = vi.fn()
    const off = onUnauthorized(listener)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' })))

    await expect(api.get('/api/v1/me')).rejects.toBeInstanceOf(ApiError)
    expect(listener).not.toHaveBeenCalled()

    await expect(api.get('/api/v1/courses')).rejects.toMatchObject({ status: 401 })
    await expect(api.post('/api/v1/requests', {})).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledTimes(2)

    off()
    await expect(api.get('/api/v1/courses')).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not fire on other errors', async () => {
    const listener = vi.fn()
    const off = onUnauthorized(listener)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(409, { message: 'Refused.', code: 'refused' })))

    await expect(api.post('/api/v1/requests', {})).rejects.toMatchObject({ status: 409 })
    expect(listener).not.toHaveBeenCalled()
    off()
  })

  it('clears the signed-in user when a call answers 401 mid-use', async () => {
    const admin = { id: 1, name: 'Noor', email: 'noor@example.com', is_admin: true }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: admin }))
      .mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }))
    vi.stubGlobal('fetch', fetchMock)

    function WhoAmI() {
      const { loading, user } = useSession()
      return createElement('p', null, loading ? 'loading' : (user?.name ?? 'signed out'))
    }
    render(createElement(SessionProvider, null, createElement(WhoAmI)))

    expect(await screen.findByText('Noor')).toBeTruthy()

    await act(async () => {
      await api.get('/api/v1/courses').catch(() => undefined)
    })

    expect(screen.getByText('signed out')).toBeTruthy()
  })
})
