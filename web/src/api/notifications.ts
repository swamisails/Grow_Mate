import { api, type Resource } from './client'
import type { Notice } from './types/notifications'

/** The signed-in Employee's notices, newest first; Admin has none (a 403). */
export async function listNotices(): Promise<Notice[]> {
  const { data } = await api.get<Resource<Notice[]>>('/api/v1/notices')
  return data
}
