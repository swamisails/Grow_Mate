import { api, ApiError, fetchCsrfCookie, type Resource } from './client'
import type { SignInRequest, User } from './types/accounts'

/** The signed-in user, or null when there is no session (401). */
export async function getMe(): Promise<User | null> {
  try {
    const { data } = await api.get<Resource<User>>('/api/v1/me')
    return data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export async function signIn(credentials: SignInRequest): Promise<User> {
  await fetchCsrfCookie()
  const { data } = await api.post<Resource<User>>('/api/v1/login', credentials)
  return data
}

export async function signOut(): Promise<void> {
  await api.post<void>('/api/v1/logout')
}
