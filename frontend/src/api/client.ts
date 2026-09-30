import type {
  Analytics,
  AuthUser,
  DatasetRequest,
  DatasetRequestDetail,
  Episode,
  ImportResult,
  Quality,
  RequestStatus,
  User,
} from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** For the CSV import, which sends FormData rather than JSON. */
  raw?: BodyInit
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, raw } = options

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      // The session is an httpOnly cookie; fetch does not send cookies on cross-origin
      // requests by default, and in dev this call is proxied same-origin anyway (see
      // vite.config.ts), so this is a no-op there and load-bearing once deployed separately.
      credentials: 'same-origin',
      headers: raw || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = (payload && typeof payload.detail === 'string' && payload.detail) || response.statusText
    throw new ApiError(response.status, message)
  }

  return payload as T
}

function query(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthUser>('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: (signal?: AbortSignal) => request<AuthUser>('/auth/me', { signal }),
}

export const usersApi = {
  list: (signal?: AbortSignal) => request<User[]>('/users', { signal }),
  create: (body: { email: string; name: string; password: string; role: string; organisation?: string | null }) =>
    request<User>('/users', { method: 'POST', body }),
  update: (id: string, body: { role?: string; is_active?: boolean }) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body }),
}

export const episodesApi = {
  list: (
    params: { task_name?: string; quality?: Quality; unassigned_only?: boolean; limit?: number },
    signal?: AbortSignal,
  ) => request<Episode[]>(`/episodes${query(params)}`, { signal }),
  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<ImportResult>('/episodes/import', { method: 'POST', raw: form })
  },
}

export const requestsApi = {
  list: (signal?: AbortSignal) => request<DatasetRequest[]>('/requests', { signal }),
  get: (id: string, signal?: AbortSignal) => request<DatasetRequestDetail>(`/requests/${id}`, { signal }),
  create: (body: { task_name: string; episodes_requested: number; deadline: string; notes?: string | null }) =>
    request<DatasetRequest>('/requests', { method: 'POST', body }),
  changeStatus: (id: string, to_status: RequestStatus) =>
    request<DatasetRequest>(`/requests/${id}/status`, { method: 'POST', body: { to_status } }),
  assign: (id: string, episodeIds: string[]) =>
    request<DatasetRequestDetail>(`/requests/${id}/assignments`, {
      method: 'POST',
      body: { episode_ids: episodeIds },
    }),
  unassign: (requestId: string, assignmentId: string) =>
    request<void>(`/requests/${requestId}/assignments/${assignmentId}`, { method: 'DELETE' }),
}

export const analyticsApi = {
  get: (params: { date_from?: string; date_to?: string }, signal?: AbortSignal) =>
    request<Analytics>(`/analytics${query(params)}`, { signal }),
}
